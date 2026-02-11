# GreenChainz Scraper Scheduler

Automated system to continuously populate the GreenChainz database with materials, suppliers, and EPD data.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Scraper Scheduler                          │
│  (Azure Function Timer Trigger OR Cron Job)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Dispatches jobs to
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Azure Storage Queue                            │
│  Queue: scraper-tasks                                       │
│  Queue: integration-tasks                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Processed by
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Azure Function App (greenchainz-scraper)            │
│  - Scrapes material data from EPD databases                 │
│  - Extracts GWP, certifications, manufacturer info          │
│  - Stores results in PostgreSQL                             │
└─────────────────────────────────────────────────────────────┘
```

## What Gets Scraped

### Materials (30 categories)
- **Structural**: concrete, steel, rebar, precast concrete
- **Insulation**: mineral wool, fiberglass, spray foam, rigid foam
- **Cladding**: aluminum, glass curtain wall, metal panels, fiber cement
- **Interior**: gypsum board, ceiling tiles, flooring, carpet, ceramic tile
- **Wood**: CLT panels, glulam beams, plywood, OSB
- **MEP**: copper piping, PVC, electrical conduit, ductwork

### EPD Databases (3 sources)
- **EC3 Database** (Building Transparency)
- **EPD International** (Environdec)
- **Building Transparency** (Open EPD data)

### Data Extracted
- Global Warming Potential (GWP) per unit
- Manufacturer name
- Product name
- EPD URL and certification details
- Material specifications

## Deployment Options

### Option A: Azure Function Timer Trigger (Recommended for Production)

**Pros:**
- Fully managed, no server maintenance
- Automatic scaling
- Integrated with Azure ecosystem
- Built-in monitoring and logging

**Setup:**

1. **Deploy Azure Function:**
   ```bash
   cd /path/to/green-sourcing-b2b-app
   
   # Build the function
   npm run build
   
   # Deploy to Azure
   func azure functionapp publish greenchainz-scraper
   ```

2. **Configure environment variables in Azure Portal:**
   - `AZURE_STORAGE_ACCOUNT_NAME=greenchainzscraper`
   - Or `AZURE_STORAGE_CONNECTION_STRING=<your-connection-string>`

3. **Verify deployment:**
   ```bash
   # Check function logs
   func azure functionapp logstream greenchainz-scraper
   ```

**Schedule:** Runs daily at 2:00 AM UTC (configurable in `function.json`)

### Option B: Manual Execution (For Testing)

**Run locally:**

```bash
cd /path/to/green-sourcing-b2b-app

# Set environment variables
export AZURE_STORAGE_ACCOUNT_NAME=greenchainzscraper
# OR
export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=..."

# Run the scheduler
npx tsx scripts/scraper-scheduler.ts
```

### Option C: Cron Job on Server

**Setup cron job:**

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2:00 AM
0 2 * * * cd /path/to/green-sourcing-b2b-app && npx tsx scripts/scraper-scheduler.ts >> /var/log/greenchainz-scraper.log 2>&1
```

## Monitoring

### Check Queue Status

```bash
# Using Azure CLI
az storage queue list --account-name greenchainzscraper

# Check message count
az storage message peek --queue-name scraper-tasks --account-name greenchainzscraper --num-messages 10
```

### Check Function Logs

```bash
# Stream logs in real-time
func azure functionapp logstream greenchainz-scraper

# Or view in Azure Portal:
# Azure Portal → Function App → greenchainz-scraper → Monitor → Logs
```

### Check Database

```bash
# Connect to PostgreSQL
export PGPASSWORD="$(az account get-access-token --resource https://ossrdbms-aad.database.windows.net --query accessToken --output tsv)"

psql -h greenchainz-db-prod.postgres.database.azure.com -U founder1@greenchainz.com -d postgres

# Check material count
SELECT COUNT(*) FROM Materials;

# Check recent scrapes
SELECT * FROM Materials ORDER BY created_at DESC LIMIT 10;

# Check by category
SELECT ProductName, Manufacturer, GWP_per_unit 
FROM Materials 
WHERE ProductName ILIKE '%concrete%' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Configuration

### Change Scraping Schedule

Edit `azure-functions/scraper-timer/function.json`:

```json
{
  "schedule": "0 0 2 * * *"
}
```

**Cron format:** `{second} {minute} {hour} {day} {month} {dayOfWeek}`

**Examples:**
- Every hour: `0 0 * * * *`
- Every 6 hours: `0 0 */6 * * *`
- Daily at 2 AM: `0 0 2 * * *`
- Weekly on Sunday at 3 AM: `0 0 3 * * 0`

### Add More Materials

Edit `scripts/scraper-scheduler.ts`:

```typescript
const MATERIAL_CATEGORIES = [
  // Add your materials here
  'cross-laminated timber',
  'recycled steel',
  'hempcrete',
  // ...
];
```

### Add More EPD Sources

Edit `scripts/scraper-scheduler.ts`:

```typescript
const SUPPLIER_SOURCES = [
  {
    name: 'Your EPD Database',
    url: 'https://example.com/epd',
    type: 'custom'
  },
  // ...
];
```

## Troubleshooting

### Jobs not being queued

**Check environment variables:**
```bash
# In Azure Portal → Function App → Configuration
# Verify AZURE_STORAGE_ACCOUNT_NAME is set
```

**Check storage account access:**
```bash
az storage account show --name greenchainzscraper --resource-group rg-greenchainz
```

### Function not triggering

**Check timer trigger status:**
```bash
func azure functionapp list-functions greenchainz-scraper
```

**Manually trigger function:**
```bash
# In Azure Portal → Function App → Functions → scraper-timer → Test/Run
```

### Scrapers failing

**Check Azure Function logs:**
```bash
func azure functionapp logstream greenchainz-scraper --browser
```

**Common issues:**
- Rate limiting from EPD websites (add delays)
- Website structure changed (update scraper selectors)
- Network timeout (increase timeout in function.json)

## Performance

### Expected Execution Time

- **Material scraping**: ~2 minutes (30 materials × 2 sec rate limit)
- **EPD sync**: ~15 seconds (3 sources × 5 sec rate limit)
- **Data janitor**: Queued for later execution (runs after scraping completes)

**Total scheduler runtime**: ~2-3 minutes

### Queue Processing Time

- Depends on Azure Function App scaling and scraper complexity
- Typically 30-60 seconds per material
- Total processing time: 15-30 minutes for all jobs

### Database Growth

- **Initial run**: ~30 materials × ~10 products each = ~300 rows
- **Daily incremental**: ~50-100 new products
- **Monthly growth**: ~1,500-3,000 products

## Cost Estimation

### Azure Function Consumption Plan

- **Executions**: 1/day × 30 days = 30/month
- **Execution time**: ~3 minutes/run = 90 minutes/month
- **Memory**: 512 MB
- **Cost**: ~$0.00 (within free tier: 1M executions, 400K GB-s)

### Azure Storage Queue

- **Operations**: ~30 queue writes/day = 900/month
- **Storage**: Minimal (messages deleted after processing)
- **Cost**: ~$0.00 (within free tier)

### Azure Function App (Processing)

- **Executions**: ~30 scraper runs/day = 900/month
- **Execution time**: ~60 sec/run = 900 minutes/month
- **Cost**: ~$0.00-$5.00/month (depends on scaling)

**Total estimated cost**: **$0-$5/month**

## Next Steps

1. **Deploy the scheduler** (Option A recommended)
2. **Run initial scrape** to populate database
3. **Monitor logs** for first 24 hours
4. **Verify data quality** in PostgreSQL
5. **Adjust schedule** based on data freshness needs
6. **Add more materials** as needed

## Files Created

```
scripts/
  scraper-scheduler.ts          # Main scheduler script
  SCRAPER_SCHEDULER_README.md   # This file

azure-functions/
  scraper-timer/
    function.json                # Timer trigger configuration
    index.ts                     # Azure Function entry point
```

## Support

For issues or questions:
- Check Azure Function logs first
- Verify queue has messages
- Test scraper endpoints manually via `/api/scrape/*`
- Review database for data quality issues
