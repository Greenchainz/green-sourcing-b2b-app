#!/usr/bin/env python3
"""
GreenChainz Azure AI Search Indexer
=====================================
Pulls live data from greenchainz-db-prod (PostgreSQL) and indexes it into
the greenchainz-search Azure AI Search service. This gives all 17 Foundry
agents access to live platform data when answering questions.

Indexes created:
  - greenchainz-materials   : product name, category, GWP, certifications, EPD data
  - greenchainz-suppliers   : company name, location, materials offered, certifications
  - greenchainz-schema      : DB schema documentation (tables, columns, types)
  - greenchainz-assemblies  : assembly specs with performance metrics

Usage:
  python index_search.py                    # index everything
  python index_search.py --index materials  # index one collection
  python index_search.py --dry-run          # print what would be indexed

Dependencies:
  pip install azure-search-documents psycopg2-binary python-dotenv

Authentication:
  Set AZURE_SEARCH_ADMIN_KEY and DATABASE_URL in environment or .env file
  OR use az login for Managed Identity auth to Key Vault
"""

import os
import sys
import json
import argparse
from datetime import datetime
from typing import Any

try:
    from azure.search.documents import SearchClient
    from azure.search.documents.indexes import SearchIndexClient
    from azure.search.documents.indexes.models import (
        SearchIndex,
        SearchField,
        SearchFieldDataType,
        SimpleField,
        SearchableField,
        VectorSearch,
        HnswAlgorithmConfiguration,
        VectorSearchProfile,
    )
    from azure.core.credentials import AzureKeyCredential
except ImportError:
    print("ERROR: Missing azure-search-documents. Run:")
    print("  pip install azure-search-documents")
    sys.exit(1)

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: Missing psycopg2. Run:")
    print("  pip install psycopg2-binary")
    sys.exit(1)

# ── Configuration ──────────────────────────────────────────────────────────────

SEARCH_ENDPOINT = os.getenv(
    "AZURE_SEARCH_ENDPOINT",
    "https://greenchainz-search.search.windows.net"
)
SEARCH_ADMIN_KEY = os.getenv("AZURE_SEARCH_ADMIN_KEY", "")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    # Falls back to the prod connection string format — override in .env
    "postgresql://greenchainz_admin@greenchainz-db-prod:PASSWORD@greenchainz-db-prod.postgres.database.azure.com:5432/greenchainz?sslmode=require"
)

# ── Index Definitions ──────────────────────────────────────────────────────────

INDEXES = {
    "greenchainz-materials": SearchIndex(
        name="greenchainz-materials",
        fields=[
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="productName", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SearchableField(name="manufacturer", type=SearchFieldDataType.String),
            SearchableField(name="category", type=SearchFieldDataType.String),
            SearchableField(name="description", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SimpleField(name="gwpValue", type=SearchFieldDataType.Double, filterable=True, sortable=True),
            SimpleField(name="declaredUnit", type=SearchFieldDataType.String),
            SimpleField(name="hasEpd", type=SearchFieldDataType.Boolean, filterable=True),
            SimpleField(name="epdExpiry", type=SearchFieldDataType.String),
            SearchableField(name="certifications", type=SearchFieldDataType.String),
            SearchableField(name="csiDivision", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="fireRating", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="rValue", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="compressiveStrength", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="recycledContent", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="materialCreditScore", type=SearchFieldDataType.Double, filterable=True, sortable=True),
            SimpleField(name="isVerified", type=SearchFieldDataType.Boolean, filterable=True),
            SimpleField(name="updatedAt", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
        ],
    ),

    "greenchainz-suppliers": SearchIndex(
        name="greenchainz-suppliers",
        fields=[
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="companyName", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SearchableField(name="description", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SearchableField(name="materialsOffered", type=SearchFieldDataType.String),
            SearchableField(name="certifications", type=SearchFieldDataType.String),
            SimpleField(name="city", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="state", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="isVerified", type=SearchFieldDataType.Boolean, filterable=True),
            SimpleField(name="verificationScore", type=SearchFieldDataType.Double, filterable=True, sortable=True),
            SimpleField(name="activeRfqs", type=SearchFieldDataType.Int32, filterable=True),
            SimpleField(name="createdAt", type=SearchFieldDataType.DateTimeOffset, filterable=True),
        ],
    ),

    "greenchainz-schema": SearchIndex(
        name="greenchainz-schema",
        fields=[
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="tableName", type=SearchFieldDataType.String),
            SearchableField(name="columnName", type=SearchFieldDataType.String),
            SimpleField(name="dataType", type=SearchFieldDataType.String),
            SimpleField(name="isNullable", type=SearchFieldDataType.Boolean),
            SearchableField(name="description", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SearchableField(name="relationships", type=SearchFieldDataType.String),
        ],
    ),

    "greenchainz-assemblies": SearchIndex(
        name="greenchainz-assemblies",
        fields=[
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="name", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SearchableField(name="description", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SearchableField(name="components", type=SearchFieldDataType.String),
            SimpleField(name="fireRating", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="acousticRating", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="thermalRValue", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="totalGwp", type=SearchFieldDataType.Double, filterable=True, sortable=True),
            SimpleField(name="csiDivision", type=SearchFieldDataType.String, filterable=True),
        ],
    ),
}

# ── Database Queries ───────────────────────────────────────────────────────────

QUERIES = {
    "greenchainz-materials": """
        SELECT
            m.id::text,
            COALESCE(m."productName", m.name, '') AS "productName",
            COALESCE(m.manufacturer, '') AS manufacturer,
            COALESCE(m.category, '') AS category,
            COALESCE(m.description, '') AS description,
            m."gwpValue",
            COALESCE(m."declaredUnit", '') AS "declaredUnit",
            COALESCE(m."hasEpd", false) AS "hasEpd",
            m."epdExpiry"::text AS "epdExpiry",
            COALESCE(m.certifications::text, '') AS certifications,
            COALESCE(m."csiDivision", '') AS "csiDivision",
            COALESCE(m."fireRating", '') AS "fireRating",
            m."rValue",
            m."compressiveStrength",
            m."recycledContent",
            m."materialCreditScore",
            COALESCE(m."isVerified", false) AS "isVerified",
            m."updatedAt"
        FROM materials m
        WHERE m."deletedAt" IS NULL
        LIMIT 5000
    """,

    "greenchainz-suppliers": """
        SELECT
            s.id::text,
            COALESCE(s."companyName", s.name, '') AS "companyName",
            COALESCE(s.description, '') AS description,
            COALESCE(s."materialsOffered"::text, '') AS "materialsOffered",
            COALESCE(s.certifications::text, '') AS certifications,
            COALESCE(s.city, '') AS city,
            COALESCE(s.state, '') AS state,
            COALESCE(s."isVerified", false) AS "isVerified",
            COALESCE(s."verificationScore", 0) AS "verificationScore",
            (SELECT COUNT(*) FROM rfqs r WHERE r."supplierId" = s.id AND r.status = 'active')::int AS "activeRfqs",
            s."createdAt"
        FROM suppliers s
        WHERE s."deletedAt" IS NULL
        LIMIT 2000
    """,

    "greenchainz-schema": """
        SELECT
            (c.table_name || '.' || c.column_name) AS id,
            c.table_name AS "tableName",
            c.column_name AS "columnName",
            c.data_type AS "dataType",
            (c.is_nullable = 'YES') AS "isNullable",
            '' AS description,
            '' AS relationships
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        ORDER BY c.table_name, c.ordinal_position
    """,

    "greenchainz-assemblies": """
        SELECT
            a.id::text,
            COALESCE(a.name, '') AS name,
            COALESCE(a.description, '') AS description,
            COALESCE(a.components::text, '[]') AS components,
            COALESCE(a."fireRating", '') AS "fireRating",
            a."acousticRating",
            a."thermalRValue",
            a."totalGwp",
            COALESCE(a."csiDivision", '') AS "csiDivision"
        FROM assemblies a
        WHERE a."deletedAt" IS NULL
        LIMIT 500
    """,
}

# ── Core Functions ─────────────────────────────────────────────────────────────

def get_db_connection():
    """Connect to greenchainz-db-prod PostgreSQL."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"ERROR: Could not connect to database: {e}")
        print("Set DATABASE_URL environment variable with the full connection string.")
        sys.exit(1)

def get_search_clients(index_name: str):
    """Return (SearchIndexClient, SearchClient) for a given index."""
    if not SEARCH_ADMIN_KEY:
        print("ERROR: AZURE_SEARCH_ADMIN_KEY not set.")
        print("Get it from: Azure Portal → greenchainz-search → Keys → Primary admin key")
        sys.exit(1)

    credential = AzureKeyCredential(SEARCH_ADMIN_KEY)
    index_client = SearchIndexClient(endpoint=SEARCH_ENDPOINT, credential=credential)
    search_client = SearchClient(endpoint=SEARCH_ENDPOINT, index_name=index_name, credential=credential)
    return index_client, search_client

def ensure_index(index_client: SearchIndexClient, index_name: str, dry_run: bool = False):
    """Create or update the search index schema."""
    index_def = INDEXES[index_name]
    if dry_run:
        print(f"  [DRY RUN] Would create/update index: {index_name}")
        return

    try:
        existing = index_client.get_index(index_name)
        print(f"  Index '{index_name}' already exists — updating schema")
        index_client.create_or_update_index(index_def)
    except Exception:
        print(f"  Creating index '{index_name}'...")
        index_client.create_index(index_def)

def fetch_and_index(index_name: str, dry_run: bool = False):
    """Pull data from DB and upload to the search index."""
    print(f"\n{'='*50}")
    print(f"Indexing: {index_name}")
    print(f"{'='*50}")

    # Connect to DB
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Run query
    query = QUERIES.get(index_name)
    if not query:
        print(f"  No query defined for {index_name} — skipping")
        return

    print(f"  Running DB query...")
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
        print(f"  Fetched {len(rows)} rows")
    except Exception as e:
        print(f"  ERROR running query: {e}")
        conn.close()
        return
    finally:
        conn.close()

    if not rows:
        print(f"  No data found — skipping index upload")
        return

    if dry_run:
        print(f"  [DRY RUN] Would upload {len(rows)} documents to '{index_name}'")
        if rows:
            print(f"  Sample document keys: {list(dict(rows[0]).keys())}")
        return

    # Prepare documents
    documents = []
    for row in rows:
        doc = {}
        for k, v in dict(row).items():
            if v is None:
                continue
            if isinstance(v, datetime):
                doc[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                doc[k] = json.dumps(v)
            else:
                doc[k] = v
        # Ensure id is a string
        if "id" in doc:
            doc["id"] = str(doc["id"])
        documents.append(doc)

    # Get search clients
    index_client, search_client = get_search_clients(index_name)
    ensure_index(index_client, index_name, dry_run)

    # Upload in batches of 1000
    batch_size = 1000
    total_uploaded = 0
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        try:
            result = search_client.upload_documents(documents=batch)
            succeeded = sum(1 for r in result if r.succeeded)
            failed = sum(1 for r in result if not r.succeeded)
            total_uploaded += succeeded
            if failed > 0:
                print(f"  Batch {i//batch_size + 1}: {succeeded} uploaded, {failed} FAILED")
            else:
                print(f"  Batch {i//batch_size + 1}: {succeeded} uploaded")
        except Exception as e:
            print(f"  ERROR uploading batch {i//batch_size + 1}: {e}")

    print(f"  DONE: {total_uploaded}/{len(documents)} documents indexed in '{index_name}'")

# ── Entry Point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="GreenChainz Azure AI Search Indexer")
    parser.add_argument(
        "--index",
        choices=list(INDEXES.keys()) + ["all"],
        default="all",
        help="Which index to build (default: all)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be indexed without actually uploading"
    )
    args = parser.parse_args()

    print("GreenChainz Azure AI Search Indexer")
    print(f"Endpoint: {SEARCH_ENDPOINT}")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE'}\n")

    if args.index == "all":
        targets = list(INDEXES.keys())
    else:
        targets = [args.index]

    for index_name in targets:
        fetch_and_index(index_name, dry_run=args.dry_run)

    print("\nIndexing complete.")
    print("Agents in Azure AI Foundry can now query greenchainz-search for live platform data.")

if __name__ == "__main__":
    main()
