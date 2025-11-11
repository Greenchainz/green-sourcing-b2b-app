# GreenChainz Quick Reference - Notifications & Docs

## 🚀 What's New

### 1. Interactive API Documentation (Swagger UI)
- **URL**: http://localhost:3001/docs
- Try all endpoints directly in browser
- Built-in authentication support
- Auto-generated from OpenAPI spec

### 2. Email Notification System
- Automated RFQ workflow emails (create → respond → accept/decline)
- Complete audit trail in database
- Admin visibility and monitoring
- Safe defaults (disabled by default)

### 3. Admin Notification Tools
- View notification history with filtering
- Test SMTP configuration
- Monitor delivery success/failure rates
- Troubleshoot email issues

---

## 📧 Quick Setup: Enable Emails

### Step 1: Configure SMTP (Gmail Example)
Edit `.env`:
```bash
NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=noreply@greenchainz.com
```

**Get Gmail App Password**: https://myaccount.google.com/apppasswords

### Step 2: Restart Backend
```powershell
docker-compose restart backend
```

### Step 3: Test Configuration
```powershell
# Send test email
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/api/v1/admin/notifications/test" `
  -Headers @{ "Authorization" = "Bearer $adminToken"; "Content-Type" = "application/json" } `
  -Body '{"to":"your-email@example.com"}'
```

---

## 🔍 Admin Endpoints (Quick Commands)

### View All Notifications
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications" `
  -Headers @{ "Authorization" = "Bearer $adminToken" }
```

### View Failed Notifications Only
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?status=failed" `
  -Headers @{ "Authorization" = "Bearer $adminToken" }
```

### View RFQ Notifications
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?type=rfq_created" `
  -Headers @{ "Authorization" = "Bearer $adminToken" }
```

### Send Test Email
```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/api/v1/admin/notifications/test" `
  -Headers @{ "Authorization" = "Bearer $adminToken"; "Content-Type" = "application/json" } `
  -Body '{"to":"test@example.com"}'
```

---

## 📊 Notification Types

| Type | Triggered By | Sent To |
|------|--------------|---------|
| `rfq_created` | Buyer sends RFQ | Supplier |
| `rfq_response_received` | Supplier responds | Buyer |
| `rfq_response_accepted` | Buyer accepts quote | Supplier |
| `rfq_response_declined` | Buyer declines quote | Supplier |
| `test_email` | Admin test endpoint | Admin-specified |

---

## 🛠️ Troubleshooting

### Notifications showing "skipped"
✅ Set `NOTIFICATIONS_ENABLED=true` in `.env`  
✅ Restart backend after changing env

### "SMTP not configured"
✅ Verify all SMTP_* variables in `.env`  
✅ Check no typos in variable names

### Emails not arriving
1. Check notification log: `?status=failed`
2. Verify SMTP credentials with test endpoint
3. Check recipient's spam folder
4. Ensure FROM_EMAIL domain not blacklisted

### Gmail "Less secure app" error
✅ Enable 2FA on Gmail account  
✅ Generate App Password (not account password)  
✅ Use App Password in `SMTP_PASS`

---

## 📖 Documentation Links

- **Full Notification Guide**: `NOTIFICATION-SYSTEM.md`
- **Swagger UI**: http://localhost:3001/docs
- **Raw OpenAPI Spec**: http://localhost:3001/api/docs
- **Copilot Instructions**: `.github/copilot-instructions.md`

---

## 🎯 Common Workflows

### Monitor Daily Notifications
```powershell
# Get last 24 hours
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?limit=100" `
  -Headers @{ "Authorization" = "Bearer $adminToken" } |
  ForEach-Object { $_.notifications } |
  Where-Object { [DateTime]$_.createdat -gt (Get-Date).AddDays(-1) }
```

### Check Notification Success Rate
```sql
-- Run in psql
SELECT 
  Status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM Notification_Log
GROUP BY Status;
```

### View Notifications for Specific User
```powershell
# Replace with actual email
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?limit=100" `
  -Headers @{ "Authorization" = "Bearer $adminToken" } |
  ForEach-Object { $_.notifications } |
  Where-Object { $_.recipient -eq "supplier@example.com" }
```

---

## 🔐 Security Notes

- Admin endpoints require Admin role JWT
- SMTP credentials never logged or exposed in API responses
- Notification content stored in database for audit trail
- Test endpoint rate-limited in production (future)

---

## 🚀 Performance Tips

- Notification logging adds ~10-20ms per email
- SMTP delivery blocks for ~100-500ms
- For high volume (>1000/day), consider async queue
- Archive logs older than 90 days

---

**Last Updated**: 2025-11-08  
**Status**: ✅ Production Ready  
**Version**: 0.1.0
