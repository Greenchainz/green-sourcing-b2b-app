# Multi-Cloud Deployment Guide
## GreenChainz Platform - Cloud Agnostic Architecture

Your Event Sourcing architecture is **100% compatible** with all major cloud providers. Choose based on which startup credits you receive.

---

## **Platform Comparison for Blockchain Integration**

### **Microsoft Azure**
**Blockchain Platform:** Azure Blockchain Service (Hyperledger Fabric)  
**Startup Credits:** Microsoft for Startups Founders Hub - **$150,000**  
**PostgreSQL:** Azure Database for PostgreSQL  
**Container Hosting:** Azure App Service / Azure Container Instances  
**Event Grid:** Azure Event Grid (for event-driven architecture)  

**Best For:** If you get Microsoft Founders Hub credits  
**Phase 2 Blockchain:** Native Hyperledger Fabric support

---

### **Google Cloud Platform (GCP)**
**Blockchain Platform:** Google Cloud Blockchain Node Engine (Ethereum) OR Self-hosted Hyperledger Fabric  
**Startup Credits:** Google Cloud for Startups - **$100,000+**  
**PostgreSQL:** Cloud SQL for PostgreSQL  
**Container Hosting:** Cloud Run / Google Kubernetes Engine (GKE)  
**Pub/Sub:** Google Cloud Pub/Sub (for event-driven architecture)  

**Best For:** If you get Google for Startups credits  
**Phase 2 Blockchain:** Requires self-hosting Hyperledger (via GKE)

---

### **Amazon Web Services (AWS)**
**Blockchain Platform:** Amazon Managed Blockchain (Hyperledger Fabric)  
**Startup Credits:** AWS Activate - **$100,000+**  
**PostgreSQL:** Amazon RDS for PostgreSQL  
**Container Hosting:** AWS App Runner / Amazon ECS / EKS  
**Event Bridge:** Amazon EventBridge (for event-driven architecture)  

**Best For:** If you get AWS Activate credits  
**Phase 2 Blockchain:** Native Hyperledger Fabric support (same as Azure)

---

## **Current Stack Compatibility Matrix**

| Component | Azure | GCP | AWS |
|-----------|-------|-----|-----|
| **Node.js 18** | ✅ App Service | ✅ Cloud Run | ✅ App Runner |
| **PostgreSQL** | ✅ Native | ✅ Cloud SQL | ✅ RDS |
| **Docker Compose** | ✅ Container Instances | ✅ Cloud Run | ✅ ECS |
| **Hyperledger Fabric** | ✅ Native Service | ⚠️ Self-Hosted (GKE) | ✅ Native Service |
| **Event Sourcing** | ✅ Event Grid | ✅ Pub/Sub | ✅ EventBridge |
| **Object Storage** | ✅ Blob Storage | ✅ Cloud Storage | ✅ S3 |

**Key Insight:** Azure and AWS have **native Hyperledger Fabric** services. GCP requires self-hosting.

---

## **Deployment Instructions (All Platforms)**

### **1. Azure Deployment**

#### **One-Click Deploy (Production)**
```bash
# Install Azure CLI
# Follow: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Create Resource Group
az group create --name greenchainz-prod --location eastus

# Deploy PostgreSQL
az postgres flexible-server create \
  --resource-group greenchainz-prod \
  --name greenchainz-db \
  --location eastus \
  --admin-user adminuser \
  --admin-password YourSecurePassword123! \
  --sku-name Standard_B1ms \
  --version 15

# Deploy Backend (App Service)
az webapp up \
  --resource-group greenchainz-prod \
  --name greenchainz-backend \
  --runtime "NODE:18-lts" \
  --sku B1

# Deploy Frontend (Static Web App)
az staticwebapp create \
  --name greenchainz-frontend \
  --resource-group greenchainz-prod \
  --location eastus
```

**Estimated Monthly Cost:** ~$50-100 (Free with Founders Hub credits)

---

### **2. Google Cloud Deployment**

#### **One-Click Deploy (Production)**
```bash
# Install gcloud CLI
# Follow: https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy PostgreSQL
gcloud sql instances create greenchainz-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create greenchainz_dev --instance=greenchainz-db

# Deploy Backend (Cloud Run)
cd backend
gcloud run deploy greenchainz-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars POSTGRES_HOST=CLOUD_SQL_CONNECTION_NAME

# Deploy Frontend (Firebase Hosting)
cd ../frontend
npm run build
firebase init hosting
firebase deploy
```

**Estimated Monthly Cost:** ~$30-70 (Free with Google for Startups credits)

---

### **3. AWS Deployment**

#### **One-Click Deploy (Production)**
```bash
# Install AWS CLI
# Follow: https://aws.amazon.com/cli/

# Configure credentials
aws configure

# Deploy PostgreSQL (RDS)
aws rds create-db-instance \
  --db-instance-identifier greenchainz-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username adminuser \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20

# Deploy Backend (App Runner)
aws apprunner create-service \
  --service-name greenchainz-backend \
  --source-configuration '{
    "CodeRepository": {
      "RepositoryUrl": "https://github.com/jnorvi5/green-sourcing-b2b-app",
      "SourceCodeVersion": {"Type": "BRANCH", "Value": "main"}
    }
  }'

# Deploy Frontend (S3 + CloudFront)
cd frontend
npm run build
aws s3 mb s3://greenchainz-frontend
aws s3 sync dist/ s3://greenchainz-frontend
aws cloudfront create-distribution \
  --origin-domain-name greenchainz-frontend.s3.amazonaws.com
```

**Estimated Monthly Cost:** ~$40-80 (Free with AWS Activate credits)

---

## **Environment Variables (All Platforms)**

Create these environment variables in your cloud provider's console:

```env
# Database Connection
POSTGRES_HOST=<your-cloud-db-host>
POSTGRES_USER=<your-db-user>
POSTGRES_PASSWORD=<your-db-password>
POSTGRES_DB=greenchainz_dev
POSTGRES_PORT=5432

# JWT Secret
JWT_SECRET=<generate-random-secret>

# Stripe (when ready)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS (update with your domain)
CORS_ORIGIN=https://your-frontend-domain.com

# Embedded Survey Forms (supports Google Forms, Typeform, Tally, etc.)
SUPPLIER_FORM_URL=https://docs.google.com/forms/d/e/EXAMPLE_SUPPLIER/viewform?embedded=true
BUYER_FORM_URL=https://docs.google.com/forms/d/e/EXAMPLE_BUYER/viewform?embedded=true

# Node Environment
NODE_ENV=production
PORT=3001
```

Quick test links you can email immediately (will preserve invite/email params):

- Supplier: https://your-backend-domain/r/supplier?invite=abc123&email=name%40company.com
- Buyer: https://your-backend-domain/r/buyer?invite=abc123&email=name%40company.com

These redirect to branded pages at /surveys/supplier and /surveys/buyer that embed your configured forms.

---

## **Phase 2: Blockchain Integration**

### **Azure Blockchain Service (Hyperledger Fabric)**
```bash
# Create Blockchain Member
az blockchain member create \
  --resource-group greenchainz-prod \
  --name greenchainz-blockchain \
  --location eastus \
  --protocol Hyperledger \
  --consortium greenchainz-network \
  --sku Basic
```

### **AWS Managed Blockchain (Hyperledger Fabric)**
```bash
# Create Blockchain Network
aws managedblockchain create-network \
  --name greenchainz-network \
  --framework HYPERLEDGER_FABRIC \
  --framework-version 2.2 \
  --voting-policy '{"ApprovalThresholdPolicy":{"ThresholdPercentage":50}}'
```

### **GCP (Self-Hosted Hyperledger on GKE)**
```bash
# Create Kubernetes Cluster
gcloud container clusters create greenchainz-blockchain \
  --zone us-central1-a \
  --num-nodes 3

# Deploy Hyperledger Fabric via Helm
kubectl create namespace hyperledger
helm install fabric-network fabric-helm-charts/fabric-network \
  --namespace hyperledger
```

---

## **Startup Credits Application Links**

### **Microsoft for Startups Founders Hub**
- **Credits:** $150,000 Azure credits
- **Requirements:** Funded startup OR B2B SaaS with traction
- **Apply:** https://www.microsoft.com/en-us/startups

### **Google for Startups Cloud Program**
- **Credits:** $100,000+ GCP credits
- **Requirements:** Early-stage startup with funding
- **Apply:** https://cloud.google.com/startup

### **AWS Activate**
- **Credits:** $100,000+ AWS credits
- **Requirements:** Portfolio company OR accelerator/incubator member
- **Apply:** https://aws.amazon.com/activate/

---

## **Recommended Strategy**

**Apply to ALL THREE** and use whichever approves you first:

1. **Priority #1:** Microsoft (best Hyperledger support, highest credits)
2. **Priority #2:** AWS (great Hyperledger support, strong ecosystem)
3. **Priority #3:** Google (requires self-hosting Hyperledger, but generous credits)

**Your current Docker-based architecture deploys identically to all three platforms** - so you can switch anytime without code changes.

---

## **Database Migration (Cloud Agnostic)**

All three cloud PostgreSQL services are compatible with your current schema. To migrate:

```bash
# Export current database
docker exec greenchainz-db pg_dump -U user greenchainz_dev > backup.sql

# Import to cloud database (works on Azure, GCP, AWS)
psql -h <cloud-db-host> -U <cloud-db-user> -d greenchainz_dev < backup.sql
```

---

## **Cost Comparison (Monthly, After Credits)**

| Service | Azure | GCP | AWS |
|---------|-------|-----|-----|
| **PostgreSQL (Small)** | $25 | $20 | $30 |
| **Backend Container** | $15 | $10 | $15 |
| **Frontend Hosting** | $5 | $0 (Firebase) | $5 |
| **Total** | **$45/mo** | **$30/mo** | **$50/mo** |

**All three are viable for a bootstrapped startup. Choose based on credits.**

---

## **Next Steps**

1. ✅ **Apply for startup credits** (all three platforms)
2. ✅ **Deploy to whichever approves first** (use scripts above)
3. ✅ **Keep current local Docker setup** for development
4. ✅ **Phase 2 blockchain** can be added later (architecture is ready)

Your platform is **cloud-agnostic by design**. No vendor lock-in. 🚀
