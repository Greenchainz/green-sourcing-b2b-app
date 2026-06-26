# Architecture Overview

## System Diagram

```
┌─────────────────────┐     ┌─────────────────────┐
│  Autodesk Revit     │     │  Autodesk Forma     │
│  (Plugin Panel)     │     │  (Extension Panel)  │
└────────┬────────────┘     └────────┬────────────┘
         │ HTTPS                      │ HTTPS
         └──────────┬─────────────────┘
                    ▼
         ┌──────────────────────┐
         │  GreenChainz API     │
         │  (Azure Container    │
         │   Apps / HTTPS)      │
         └──────────┬───────────┘
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
   ┌──────────┐ ┌────────┐ ┌──────────┐
   │PostgreSQL│ │  EPD   │ │ Supplier │
   │  (Azure) │ │ Data   │ │ Catalog  │
   └──────────┘ └────────┘ └──────────┘
```

## Key Design Decisions

- **No secrets in client** — All API keys and credentials are server-side only
- **HTTPS everywhere** — No HTTP endpoints exposed
- **OAuth 2.0 auth** — Token-based authentication, no Autodesk credentials stored
- **Azure-hosted** — Multi-tenant SaaS on Azure Container Apps
- **Role-based access** — Users only see data they're authorized for

## Data Flow

1. User selects material in Revit/Forma
2. Plugin/Extension sends authenticated request to GreenChainz API
3. API queries PostgreSQL for EPD data, supplier catalog, and carbon metrics
4. Response returned to plugin/extension
5. Data rendered in native Autodesk UI panel

## Security Boundaries

- Plugin/Extension ↔ API: TLS 1.2+ encrypted
- API ↔ Database: Azure private networking
- No PII transmitted to Autodesk
- No Autodesk project data stored server-side
