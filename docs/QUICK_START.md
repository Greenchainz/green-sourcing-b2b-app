# Quick Start: Deploy the Toolbox

## In 5 Minutes: Get Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cat > .env.local << EOF
AZURE_SQL_SERVER=your-server.database.windows.net
AZURE_SQL_DATABASE=your-db
AZURE_SQL_USER=your-user
AZURE_SQL_PASSWORD=your-password
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

# 3. Start dev server
npm run dev

# 4. Open in browser
open http://localhost:3000
```

**You should see:**
- ✅ New Toolbox homepage with 3 tools
- ✅ Excel Audit tool landing page at `/excel-addin`
- ✅ Chrome extension landing page at `/chrome-extension`
- ✅ Revit plugin landing page at `/revit-plugin`

---

## Test the Excel Audit API

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test the API
curl -X POST http://localhost:3000/api/audit/excel-batch \
  -H "Content-Type: application/json" \
  -d '{
    "materials": [
      "Drywall 5/8",
      "Concrete 4000 PSI",
      "Steel Beam"
    ]
  }'

# Expected response:
# {
#   "results": [
#     {"original": "Drywall 5/8", "carbon_score": 5.5, "health_grade": "A", ...},
#     ...
#   ],
#   "count": 3,
#   "timestamp": "2026-01-07T..."
# }
```

If you get an error, check:
1. Azure SQL connection string is correct
2. `Products` table exists and has sample data
3. Scraper endpoint is running (if fallback needed)

---

## Deploy to Azure (Production)

```bash
# 1. Push to GitHub
git add .
git commit -m "feat: Toolbox pivot - Excel audit tool, homepage redesign"
git push origin main

# 2. GitHub Actions auto-deploys to Azure Container Apps
# (Just push and wait 2-3 minutes for deployment to complete)

# 3. Environment variables are already configured in Azure Container Apps
# Check Azure Portal → Container Apps → greenchainz-frontend → Configuration

# 4. Update manifest for production
# File: public/manifest.xml
# Change: <SourceLocation DefaultValue="https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/excel-addin"/>
```

---

## Test Excel Add-in (Office Online)

### Step 1: Generate GUID for manifest
```bash
# Go to https://www.uuidgenerator.net/
# Copy GUID and update public/manifest.xml:
# <Id>YOUR_NEW_GUID_HERE</Id>
```

### Step 2: Upload to Excel Online
1. Go to **Office.com** → Open **Excel Online**
2. Click **Insert** → **Get Add-ins** → **My Add-ins** → **Upload My Add-in**
3. Choose `public/manifest.xml` from your repo
4. Excel loads the add-in in a sidebar
5. Click **"Run Audit"** with sample data

### Step 3: Test with sample materials
```
Select these cells in Excel:
- Drywall 5/8
- Concrete 4000 PSI
- Steel Beam

Click "Run Audit" → should append 3 columns with carbon scores
```

---

## Seed Database with Sample Materials

Before testing, populate Azure SQL with some common materials:

```sql
INSERT INTO Products (name, gwp_per_unit, health_grade, red_list_status, certifications, has_epd, created_at)
VALUES
  ('Drywall 5/8 Type X', 5.5, 'A', 'Free', 'Cradle to Cradle', 1, GETDATE()),
  ('Concrete 4000 PSI', 180.0, 'C', 'None', 'ISO 14040', 1, GETDATE()),
  ('Steel Beam A36', 2100.0, 'A', 'Free', 'ISO 14040', 1, GETDATE()),
  ('OSB 7/16 Sheathing', 2.8, 'C', 'None', 'FSC', 1, GETDATE()),
  ('Rigid Foam Insulation', 4.2, 'F', 'None', NULL, 0, GETDATE());
```

Now test the API again—these should be found in the "fast path" (no scraper needed).

---

## Troubleshooting

### "Cannot find module 'mssql'"
```bash
npm install mssql
```

### "Connection refused" (Azure SQL)
- Check connection string in `.env.local`
- Verify IP is whitelisted in Azure SQL Firewall
- Test connection: `npm run test:db` (if configured)

### "Products table not found"
```sql
-- Check if table exists
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Products';

-- If missing, create it:
CREATE TABLE Products (
  id INT PRIMARY KEY IDENTITY,
  name VARCHAR(255),
  gwp_per_unit FLOAT,
  health_grade VARCHAR(1),
  red_list_status VARCHAR(20),
  certifications VARCHAR(500),
  has_epd BIT,
  created_at DATETIME2
);
```

### Excel add-in won't load
- Verify manifest has correct GUID
- Check `<SourceLocation>` points to deployed URL
- Try refreshing Excel or clearing browser cache

---

## Next Steps

1. ✅ **Test locally** (5 min)
2. ✅ **Deploy to Azure** (automatic via GitHub Actions)
3. ✅ **Test Excel add-in** (15 min)
4. 🔄 **Enable Azure AD auth** (optional, for enterprise)
5. 🔄 **Submit to Office AppSource** (3-5 day review)

---

## Questions?

See full documentation:
- [Excel Add-in Setup](EXCEL_ADDIN_SETUP.md)
- [Scraper Integration](EXCEL_SCRAPER_INTEGRATION.md)
- [Strategic Overview](TOOLBOX_LAUNCH_SUMMARY.md)
