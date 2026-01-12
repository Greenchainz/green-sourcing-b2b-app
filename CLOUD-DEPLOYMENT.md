# Azure Deployment Guide
## GreenChainz Platform - Azure-Only Architecture

GreenChainz is deployed **exclusively on Microsoft Azure**. This guide covers production deployment to Azure Container Apps with Azure PostgreSQL, Azure Blob Storage, Azure AD authentication, and Azure OpenAI.

---

## **Azure Infrastructure Overview**

**Hosting:** Azure Container Apps (serverless containers)  
**Database:** Azure Database for PostgreSQL (Flexible Server)  
**Storage:** Azure Blob Storage  
**Authentication:** Azure AD B2C  
**AI Services:** Azure OpenAI (GPT-4)  
**Email:** Zoho Mail  
**CI/CD:** GitHub Actions with Federated Identity

---

## **Production Architecture**

```yaml
Frontend:
  Service: Azure Container Apps
  Technology: Next.js 15
  URL: greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io
  
Backend:
  Service: Azure Container Apps  
  Technology: Node.js 20 + Express
  URL: greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io

Database:
  Service: Azure Database for PostgreSQL (Flexible Server)
  Version: PostgreSQL 15
  
Storage:
  Service: Azure Blob Storage
  Accounts: greenchainzscraper, revitfiles
  
Authentication:
  Service: Azure AD (Multi-tenant + Personal Accounts)
  App ID: 479e2a01-70ab-4df9-baa4-560d317c3423
```

---

## **Azure Deployment Instructions**

### **Step 1: Prerequisites**

```bash
# Install Azure CLI
# macOS: brew install azure-cli
# Windows: Download from https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "greenchainz-core-start"
```

---

### **Step 2: Create Resource Group**

```bash
# Create resource group in East US
az group create \
  --name rg-greenchainz-prod \
  --location eastus
```

---

### **Step 3: Deploy Azure PostgreSQL**

```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group rg-greenchainz-prod \
  --name greenchainz-db-prod \
  --location eastus \
  --admin-user azureuser \
  --admin-password <YourSecurePassword123!> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32 \
  --high-availability Disabled

# Allow Azure services to access the database
az postgres flexible-server firewall-rule create \
  --resource-group rg-greenchainz-prod \
  --name greenchainz-db-prod \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Create database
az postgres flexible-server db create \
  --resource-group rg-greenchainz-prod \
  --server-name greenchainz-db-prod \
  --database-name greenchainz_production
```

---

### **Step 4: Create Azure Container Registry**

```bash
# Create container registry
az acr create \
  --resource-group rg-greenchainz-prod \
  --name acrgreenchainzprod \
  --sku Basic

# Enable admin access (for local development)
az acr update \
  --name acrgreenchainzprod \
  --admin-enabled true

# Get credentials
az acr credential show --name acrgreenchainzprod
```

---

### **Step 5: Build and Push Docker Images**

```bash
# Login to ACR
az acr login --name acrgreenchainzprod

# Build and push frontend
docker build -t acrgreenchainzprod.azurecr.io/greenchainz-frontend:latest -f Dockerfile.azure .
docker push acrgreenchainzprod.azurecr.io/greenchainz-frontend:latest

# Build and push backend
docker build -t acrgreenchainzprod.azurecr.io/greenchainz-backend:latest -f Dockerfile.backend .
docker push acrgreenchainzprod.azurecr.io/greenchainz-backend:latest
```

---

### **Step 6: Create Container Apps Environment**

```bash
# Create Container Apps environment
az containerapp env create \
  --name greenchainz-container-env \
  --resource-group rg-greenchainz-prod \
  --location eastus
```

---

### **Step 7: Deploy Backend Container App**

```bash
# Deploy backend
az containerapp create \
  --name greenchainz-backend \
  --resource-group rg-greenchainz-prod \
  --environment greenchainz-container-env \
  --image acrgreenchainzprod.azurecr.io/greenchainz-backend:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server acrgreenchainzprod.azurecr.io \
  --registry-username <acr-username> \
  --registry-password <acr-password> \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    DATABASE_URL=<postgresql-connection-string> \
    AZURE_STORAGE_CONNECTION_STRING=<storage-connection-string> \
    AZURE_OPENAI_API_KEY=<openai-key>
```

---

### **Step 8: Deploy Frontend Container App**

```bash
# Deploy frontend
az containerapp create \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod \
  --environment greenchainz-container-env \
  --image acrgreenchainzprod.azurecr.io/greenchainz-frontend:latest \
  --target-port 3000 \
  --ingress external \
  --registry-server acrgreenchainzprod.azurecr.io \
  --registry-username <acr-username> \
  --registry-password <acr-password> \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    NEXT_PUBLIC_API_URL=https://greenchainz-backend.<region>.azurecontainerapps.io \
    NEXTAUTH_URL=https://greenchainz-frontend.<region>.azurecontainerapps.io
```

---

### **Step 9: Create Azure Blob Storage**

```bash
# Create storage account
az storage account create \
  --name greenchainzscraper \
  --resource-group rg-greenchainz-prod \
  --location eastus \
  --sku Standard_LRS

# Get connection string
az storage account show-connection-string \
  --name greenchainzscraper \
  --resource-group rg-greenchainz-prod

# Create blob containers
az storage container create \
  --name epd-documents \
  --account-name greenchainzscraper \
  --connection-string <connection-string>
```

**Estimated Monthly Cost:** ~$75-150 with Azure credits

---

## **Environment Variables (Azure)**

Configure these environment variables in Azure Container Apps or Azure Key Vault:

```env
# Database Connection (Azure PostgreSQL)
DATABASE_URL=postgresql://azureuser:<password>@greenchainz-db-prod.postgres.database.azure.com:5432/greenchainz_production?sslmode=require

# Azure SQL (if using Azure SQL instead of PostgreSQL)
AZURE_SQL_SERVER=greenchainz-db-prod.database.windows.net
AZURE_SQL_DATABASE=greenchainz_production
AZURE_SQL_USER=azureuser
AZURE_SQL_PASSWORD=<your-secure-password>

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=greenchainzscraper;AccountKey=<key>;EndpointSuffix=core.windows.net
AZURE_STORAGE_ACCOUNT_NAME=greenchainzscraper
AZURE_STORAGE_ACCOUNT_KEY=<your-storage-key>

# Azure OpenAI
AZURE_OPENAI_API_KEY=<your-openai-key>
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Azure AD Authentication
AZURE_AD_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_AD_CLIENT_SECRET=<your-client-secret>
AZURE_AD_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc

# NextAuth Configuration
NEXTAUTH_URL=https://greenchainz-frontend.<region>.azurecontainerapps.io
NEXTAUTH_SECRET=<generate-random-secret>

# Stripe Payment Integration (Optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Service (Zoho Mail)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=noreply@greenchainz.com
SMTP_PASS=<your-zoho-password>

# Application Settings
NODE_ENV=production
PORT=8080
NEXT_PUBLIC_API_URL=https://greenchainz-backend.<region>.azurecontainerapps.io
```

**Setting environment variables in Azure Container Apps:**

```bash
az containerapp update \
  --name greenchainz-backend \
  --resource-group rg-greenchainz-prod \
  --set-env-vars \
    DATABASE_URL=secretref:database-url \
    AZURE_OPENAI_API_KEY=secretref:openai-key
```

---

## **Stripe Webhook Configuration**

GreenChainz uses Stripe webhooks for payment processing (RFQ deposits, supplier subscriptions).

### **Webhook Endpoints**

| Environment | Webhook URL |
|-------------|-------------|
| **Production** | `https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/webhooks/stripe` |
| **Staging** | `https://greenchainz-container-staging.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/webhooks/stripe` |

### **Setting Up Stripe Webhooks**

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint** with the appropriate URL from the table above
3. **Select events** to listen for:
   - `checkout.session.completed` - RFQ deposit payments
   - `customer.subscription.created` - Supplier tier subscriptions
   - `customer.subscription.updated` - Subscription changes
   - `customer.subscription.deleted` - Subscription cancellations
   - `invoice.paid` - Successful invoice payments
   - `invoice.payment_failed` - Failed payments

4. **Copy the signing secret** (starts with `whsec_`)
5. **Store in Azure Key Vault**:
   ```bash
   az keyvault secret set \
     --vault-name greenchainz-vault \
     --name stripe-webhook-secret \
     --value "whsec_..."
   ```

### **Verifying Webhook Configuration**

Test the webhook endpoint:
```bash
# Production
curl -X POST https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Should return 400 (missing signature) - confirms endpoint is reachable
```

### **Azure Key Vault Secrets for Payments**

Required secrets in Azure Key Vault (`greenchainz-vault`):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `stripe-secret-key` | Stripe API secret key | `sk_live_...` |
| `stripe-webhook-secret` | Webhook signing secret | `whsec_...` |

---

## **Azure AD Authentication Configuration**

GreenChainz uses Azure AD for authentication (professional identity validation).

### **OAuth Callback URLs**

| Environment | Callback URL |
|-------------|--------------|
| **Production** | `https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/login/callback` |
| **Local Dev** | `http://localhost:3000/login/callback` |

### **Setting Up Azure AD App**

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory
2. Navigate to **App registrations** → Select **greenchainz** app
3. Under **Authentication**, add the callback URLs above
4. Under **Certificates & secrets**, create a new client secret
5. Copy the **Application (client) ID** and **Directory (tenant) ID**
6. Store credentials in Azure Key Vault:
   ```bash
   az keyvault secret set \
     --vault-name greenchainz-vault \
     --name azure-ad-client-id \
     --value "479e2a01-70ab-4df9-baa4-560d317c3423"
   
   az keyvault secret set \
     --vault-name greenchainz-vault \
     --name azure-ad-client-secret \
     --value "<your-client-secret>"
   ```

---

## **CI/CD with GitHub Actions**

GreenChainz uses GitHub Actions with Federated Identity (passwordless authentication to Azure).

### **Setting Up Federated Identity**

1. **Create Service Principal**:
   ```bash
   az ad sp create-for-rbac \
     --name "greenchainz-github-actions" \
     --role contributor \
     --scopes /subscriptions/<subscription-id>/resourceGroups/rg-greenchainz-prod
   ```

2. **Create Federated Credential**:
   ```bash
   az ad app federated-credential create \
     --id <application-id> \
     --parameters federated-cred.json
   ```

3. **Add GitHub Secrets**:
   - `AZURE_CLIENT_ID`: Service principal client ID
   - `AZURE_TENANT_ID`: Azure tenant ID
   - `AZURE_SUBSCRIPTION_ID`: Azure subscription ID

### **GitHub Actions Workflow**

The repository includes `.github/workflows/deploy-azure-cd.yml` for automated deployments.

```yaml
name: Deploy to Azure Container Apps
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      
      - name: Build and push to ACR
        run: |
          az acr build \
            --registry acrgreenchainzprod \
            --image greenchainz-frontend:latest \
            --file Dockerfile.azure .
      
      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --name greenchainz-frontend \
            --resource-group rg-greenchainz-prod \
            --image acrgreenchainzprod.azurecr.io/greenchainz-frontend:latest
```

---

## **Database Migration (Azure PostgreSQL)**

To migrate your database schema to Azure PostgreSQL:

```bash
# Export current database
docker exec greenchainz-db pg_dump -U user greenchainz_dev > backup.sql

# Import to Azure PostgreSQL
psql "postgresql://azureuser:<password>@greenchainz-db-prod.postgres.database.azure.com:5432/greenchainz_production?sslmode=require" < backup.sql

# Or use Azure CLI
az postgres flexible-server execute \
  --name greenchainz-db-prod \
  --admin-user azureuser \
  --admin-password <password> \
  --database-name greenchainz_production \
  --file-path backup.sql
```

---

## **Monitoring and Logging**

### **Azure Application Insights**

```bash
# Create Application Insights
az monitor app-insights component create \
  --app greenchainz-platform \
  --location eastus \
  --resource-group rg-greenchainz-prod

# Get instrumentation key
az monitor app-insights component show \
  --app greenchainz-platform \
  --resource-group rg-greenchainz-prod \
  --query instrumentationKey
```

### **View Logs**

```bash
# Stream container logs
az containerapp logs show \
  --name greenchainz-backend \
  --resource-group rg-greenchainz-prod \
  --follow

# Query log analytics
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == 'greenchainz-backend' | order by TimeGenerated desc"
```

---

## **Cost Optimization**

### **Monthly Cost Estimate (Production)**

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Container Apps (Frontend) | 0.5 vCPU, 1GB | ~$15 |
| Container Apps (Backend) | 0.5 vCPU, 1GB | ~$15 |
| PostgreSQL Flexible Server | Burstable B1ms | ~$25 |
| Blob Storage | Standard LRS | ~$5 |
| Container Registry | Basic | ~$5 |
| Application Insights | Basic | ~$10 |
| **Total** | | **~$75/month** |

**With Microsoft for Startups credits:** Effectively free for 1-2 years

### **Scaling Strategy**

```bash
# Scale container apps based on HTTP requests
az containerapp update \
  --name greenchainz-backend \
  --resource-group rg-greenchainz-prod \
  --min-replicas 1 \
  --max-replicas 5 \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 100
```

---

## **Next Steps**

1. ✅ **Apply for Microsoft for Startups credits** - Up to $150,000 Azure credits
2. ✅ **Deploy infrastructure** using the commands above
3. ✅ **Set up CI/CD** with GitHub Actions
4. ✅ **Configure monitoring** with Application Insights
5. ✅ **Test production environment** end-to-end

Your platform is **Azure-native** and production-ready. 🚀
