# Submittal Auto-Generator

Generate a contractor-ready submittal package from a spec PDF: cover sheet, comparison, and appended EPD PDFs.

## Env Vars

Set in `.env.local` for Next.js:

- AZURE_FORMRECOGNIZER_ENDPOINT
- AZURE_FORMRECOGNIZER_KEY
- AZURE_OPENAI_ENDPOINT
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_DEPLOYMENT (e.g., gpt-4o-mini)
- AZURE_SQL_SERVER
- AZURE_SQL_DATABASE
- AZURE_SQL_USER
- AZURE_SQL_PASSWORD

## Try It Locally

```bash
pnpm install
pnpm dev
# Open http://localhost:3000/tools/submittal-generator
```

## API

POST `/api/submittal/generate` (multipart/form-data)
- `file`: PDF spec book

Returns: application/pdf with `Content-Disposition: attachment`.

## Matching Logic

Phase 1 uses Azure SQL only: selects products with EPDs (Product_EPDs.EPDDocumentURL not null), filters by category and optional max GWP.
Phase 2 can add Azure AI Search (hybrid vectors + keywords) for fuzzy spec matching.

## Notes

- Document parsing: Azure Document Intelligence `prebuilt-document` model
- Criteria extraction: Azure OpenAI structured JSON
- PDF packaging: `pdf-lib` (cover + comparison + appended EPD PDFs)
