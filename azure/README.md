# GreenChainz Azure Deployment Guide

Complete guide for deploying GreenChainz to Azure using your existing resources.

## Your Azure Resources

Based on your subscription `greenchainz-core-start`, you have:

| Resource | Type | Location | Resource Group |
|----------|------|----------|----------------|
| acrgreenchainzprod916 | Container Registry | East US | rg-greenchainz-prod-container |
| cae-greenchainz-env | Container Apps Environment | East US | rg-greenchainz-prod-container |
| greenchainz-container | Container App | East US | rg-greenchainz-prod-container |
| greenchainz | Redis Cache | East US 2 | greenchainz-production |
| greenchianz-vault | Key Vault | East US | greenchainz-production |
| greenchainz-platform | Application Insights | East US | rg-greenchainz |
| revitfiles | Storage Account | East US | rg-greenchainz |
| greenchainz-content-intel | Document Intelligence | East US | greenchainz-ai |
| greenchainz-scraper | Function App | East US | greenchainzscraper |
| greenchainz-scraper-apim | API Management | East US | greenchainzscraper |

## Quick Start

### 1. Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set your subscription
az account set --subscription "greenchainz-core-start"
```

### 2. Configure Secrets in Key Vault

```bash
# Database password
az keyvault secret set --vault-name greenchianz-vault --name postgres-password --value "YOUR_DB_PASSWORD"

# JWT secret (generate a secure one)
az keyvault secret set --vault-name greenchianz-vault --name jwt-secret --value "$(openssl rand -base64 32)"

# Session secret
az keyvault secret set --vault-name greenchianz-vault --name session-secret --value "$(openssl rand -base64 32)"

# Redis password (get from Azure Portal)
REDIS_KEY=$(az redis list-keys --name greenchainz --resource-group greenchainz-production --query "primaryKey" -o tsv)
az keyvault secret set --vault-name greenchianz-vault --name redis-password --value "$REDIS_KEY"
```

### 3. Build and Deploy

```bash
# Make the deployment script executable
chmod +x azure/deploy.sh

# Deploy everything
./azure/deploy.sh all

# Or deploy individually
./azure/deploy.sh backend
./azure/deploy.sh frontend
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Azure Container Apps                              │
│  ┌─────────────────────────────┐   ┌─────────────────────────────────────┐  │
│  │    greenchainz-frontend     │   │       greenchainz-container         │  │
│  │         (Next.js)           │──▶│       (Node.js + Express)           │  │
│  │    Port: 3000               │   │       Port: 3001                    │  │
│  └─────────────────────────────┘   └─────────────────────────────────────┘  │
│              │                                    │                          │
└──────────────┼────────────────────────────────────┼──────────────────────────┘
               │                                    │
               ▼                                    ▼
┌──────────────────────────┐     ┌─────────────────────────────────────────────┐
│   Azure CDN (optional)   │     │             Azure Services                  │
│   Custom Domain + SSL    │     │  ┌─────────────┐  ┌─────────────────────┐  │
└──────────────────────────┘     │  │  Redis      │  │  Application        │  │
                                 │  │  Cache      │  │  Insights           │  │
                                 │  └─────────────┘  └─────────────────────┘  │
                                 │  ┌─────────────┐  ┌─────────────────────┐  │
                                 │  │  Key        │  │  Document           │  │
                                 │  │  Vault      │  │  Intelligence       │  │
                                 │  └─────────────┘  └─────────────────────┘  │
                                 │  ┌─────────────┐  ┌─────────────────────┐  │
                                 │  │  Blob       │  │  PostgreSQL         │  │
                                 │  │  Storage    │  │  (Supabase)         │  │
                                 │  └─────────────┘  └─────────────────────┘  │
                                 └─────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

Copy `.env.azure.example` to `.env` and configure:

```bash
# Required
POSTGRES_HOST=your-db-host.postgres.database.azure.com
DB_USER=greenchainz_admin
DB_PASSWORD=<from Key Vault>
DB_NAME=greenchainz_prod

# Azure Services
AZURE_KEY_VAULT_URL=https://greenchianz-vault.vault.azure.net/
REDIS_HOST=greenchainz.redis.cache.windows.net
APPLICATIONINSIGHTS_CONNECTION_STRING=<from App Insights>

# Frontend (Next.js public config)
NEXT_PUBLIC_BACKEND_URL=https://<your-backend-fqdn>
NEXT_PUBLIC_AZURE_TENANT=greenchainz2025.onmicrosoft.com
NEXT_PUBLIC_AZURE_CLIENT_ID=<from Azure App Registration>
NEXT_PUBLIC_SUPABASE_URL=<from Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase>
```

### Container App Configuration

The backend Container App is configured with:
- **CPU**: 0.5 cores
- **Memory**: 1Gi
- **Min Replicas**: 1
- **Max Replicas**: 10
- **Auto-scaling**: Based on HTTP concurrent requests (50)

## Deployment Commands

### Deploy Backend Only
```bash
./azure/deploy.sh backend
```

### Deploy Frontend Only
```bash
./azure/deploy.sh frontend
```

### Check Status
```bash
./azure/deploy.sh status
```

### View Logs
```bash
./azure/deploy.sh logs greenchainz-container
```

### Manual Docker Commands
```bash
# Login to ACR
az acr login --name acrgreenchainzprod916

# Build backend
docker build -f backend/Dockerfile.azure -t acrgreenchainzprod916.azurecr.io/greenchainz-backend:latest .

# Push to ACR
docker push acrgreenchainzprod916.azurecr.io/greenchainz-backend:latest

# Update Container App
az containerapp update \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz-backend:latest
```

## Features Enabled

### Azure Cache for Redis
- Response caching for API endpoints
- Rate limiting
- Session storage (optional)

### Application Insights
- Request tracking
- Exception logging
- Custom metrics (RFQs, certifications, etc.)
- Live metrics stream

### Azure Storage
- Product images
- Certification documents
- EPD/LCA PDFs
- RFQ attachments

### Document Intelligence
- Certification document parsing
- EPD data extraction
- Document verification

### Key Vault
- Secure secret storage
- Managed Identity access
- Automatic secret rotation support

## API Endpoints

### New Azure-Powered Endpoints

#### File Uploads
- `POST /api/v1/uploads/product/:productId/image` - Upload product image
- `POST /api/v1/uploads/certification/:supplierId` - Upload certification
- `POST /api/v1/uploads/epd/:productId` - Upload EPD document
- `POST /api/v1/uploads/rfq/:rfqId/attachment` - Upload RFQ attachments
- `GET /api/v1/uploads/supplier/:supplierId/files` - List files
- `DELETE /api/v1/uploads/:blobName` - Delete file
- `GET /api/v1/uploads/sas/:blobName` - Get temporary signed URL

#### Document AI
- `POST /api/v1/ai/analyze/certification` - Analyze certification document
- `POST /api/v1/ai/analyze/epd` - Analyze EPD document
- `POST /api/v1/ai/verify` - Verify document authenticity
- `POST /api/v1/ai/extract` - Extract document content
- `POST /api/v1/ai/batch` - Batch analyze documents
- `GET /api/v1/ai/status` - Check AI service status

## Monitoring

### Application Insights Dashboard

Access at: https://portal.azure.com → Application Insights → greenchainz-platform

Key metrics tracked:
- Request rate and response times
- Error rates
- Supplier registrations
- RFQ creation and responses
- Certification verifications
- FSC sync operations

### Log Analytics

```kusto
// Recent errors
traces
| where severityLevel >= 3
| order by timestamp desc
| take 100

// API performance
requests
| summarize avg(duration), count() by name
| order by avg_duration desc

// Document analysis usage
customEvents
| where name contains "Analyzed"
| summarize count() by name, bin(timestamp, 1h)
```

## Scaling

### Auto-scaling Rules

The Container App auto-scales based on:
1. **HTTP Concurrent Requests**: Scales when > 50 concurrent requests
2. **CPU Utilization**: Scales when > 70% CPU

### Manual Scaling

```bash
# Scale to minimum 2 replicas
az containerapp update \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --min-replicas 2

# Scale to maximum 20 replicas
az containerapp update \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --max-replicas 20
```

## Custom Domain Setup

```bash
# Add custom domain to Container App
az containerapp hostname add \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --hostname api.greenchainz.com

# Bind SSL certificate
az containerapp hostname bind \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --hostname api.greenchainz.com \
  --environment cae-greenchainz-env \
  --validation-method CNAME
```

## Troubleshooting

### Container App Not Starting

```bash
# Check logs
az containerapp logs show \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --follow

# Check revision status
az containerapp revision list \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  -o table
```

### Redis Connection Issues

```bash
# Test Redis connectivity
az redis show --name greenchainz --resource-group greenchainz-production

# Get connection info
az redis list-keys --name greenchainz --resource-group greenchainz-production
```

### Key Vault Access Denied

```bash
# Get Container App managed identity
PRINCIPAL_ID=$(az containerapp show \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod-container \
  --query "identity.principalId" -o tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name greenchianz-vault \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

## Cost Optimization

Current estimated monthly cost with your configuration:
- Container Apps (2 apps, min resources): ~$30-50
- Redis Cache (Basic tier): ~$16
- Storage (10GB): ~$2
- Application Insights: ~$5-10
- Document Intelligence (pay per call): Variable

**Total**: ~$55-80/month for basic usage

## Next Steps

1. ✅ Configure secrets in Key Vault
2. ✅ Deploy backend and frontend
3. ⬜ Set up custom domain
4. ⬜ Configure CI/CD with GitHub Actions
5. ⬜ Set up monitoring alerts
6. ⬜ Enable backup/DR
