# GreenChainz Notification System

## Overview
The GreenChainz platform now includes a complete email notification system with audit logging, admin visibility, and test capabilities.

## Architecture

### Components
1. **Mailer Service** (`backend/services/mailer.js`)
   - Wraps nodemailer for SMTP email delivery
   - Automatic logging to database for all send attempts
   - Safe fallbacks when SMTP not configured

2. **Notification_Log Table** (`database-schemas/schema.sql`)
   - Persists all email attempts (sent/failed/skipped)
   - Indexed for fast admin queries
   - Tracks type, recipient, status, errors, timestamps

3. **Admin Endpoints** (`backend/index.js`)
   - GET `/api/v1/admin/notifications` - View notification history
   - POST `/api/v1/admin/notifications/test` - Send test email

4. **Swagger UI** (`/docs`)
   - Interactive API documentation
   - Serves OpenAPI spec with all endpoints

## Configuration

### Environment Variables (.env)
```bash
# Toggle notifications on/off
NOTIFICATIONS_ENABLED=false

# SMTP configuration (required when enabled)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Default sender address
FROM_EMAIL=no-reply@greenchainz.local
```

### Gmail SMTP Setup (Free Tier)
1. Enable 2-factor authentication on your Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use app password (not your Gmail password) in SMTP_PASS
4. Set SMTP_HOST=smtp.gmail.com, SMTP_PORT=587

### Alternative SMTP Providers
- **Outlook**: smtp-mail.outlook.com:587
- **SendGrid**: smtp.sendgrid.net:587 (100 emails/day free)
- **Mailgun**: smtp.mailgun.org:587 (first 5000/month free)

## Notification Types

### Automated RFQ Workflow Notifications
| Type | Trigger | Recipient | Content |
|------|---------|-----------|---------|
| `rfq_created` | Buyer sends RFQ | Supplier contact | New RFQ details, project name |
| `rfq_response_received` | Supplier responds | Buyer | Response ID, quoted price alert |
| `rfq_response_accepted` | Buyer accepts quote | Supplier | Acceptance confirmation |
| `rfq_response_declined` | Buyer declines quote | Supplier | Decline notification |

### Manual/Test Notifications
| Type | Trigger | Recipient | Content |
|------|---------|-----------|---------|
| `test_email` | Admin test endpoint | Admin-specified | SMTP validation message |

## API Endpoints

### GET /api/v1/admin/notifications
**Authorization**: Admin only  
**Purpose**: View notification history with filtering

**Query Parameters**:
- `status` - Filter by `sent`, `failed`, or `skipped`
- `type` - Filter by notification type (e.g., `rfq_created`)
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset (default: 0)

**Example Request**:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?status=failed&limit=20" `
  -Headers @{ "Authorization" = "Bearer $adminToken" }
```

**Response**:
```json
{
  "total": 1,
  "limit": 20,
  "offset": 0,
  "notifications": [
    {
      "notificationid": "1",
      "notificationtype": "test_email",
      "recipient": "test@example.com",
      "subject": "GreenChainz Test Email",
      "status": "skipped",
      "errormessage": "Notifications disabled",
      "createdat": "2025-11-08T01:48:04.169Z"
    }
  ]
}
```

### POST /api/v1/admin/notifications/test
**Authorization**: Admin only  
**Purpose**: Send test email to validate SMTP configuration

**Body**:
```json
{
  "to": "recipient@example.com"
}
```

**Example Request**:
```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/api/v1/admin/notifications/test" `
  -Headers @{ "Authorization" = "Bearer $adminToken"; "Content-Type" = "application/json" } `
  -Body '{"to":"test@example.com"}'
```

**Response**:
```json
{
  "message": "Test email attempted",
  "result": {
    "sent": false,
    "reason": "disabled"
  }
}
```

## Behavior Modes

### When NOTIFICATIONS_ENABLED=false (Default)
- All notification calls return immediately with status `skipped`
- Logs entry to Notification_Log with reason "Notifications disabled"
- No SMTP connection attempted
- API responses include `"notificationsAttempted": false`

### When NOTIFICATIONS_ENABLED=true + SMTP Configured
- Emails sent via SMTP transporter
- Success: Logs with status `sent`, returns messageId
- Failure: Logs with status `failed`, includes error message
- API responses include `"notificationsAttempted": true`

### When NOTIFICATIONS_ENABLED=true + SMTP Missing
- Logs entry with status `skipped`, reason "SMTP not configured"
- Warns in console: "Notifications enabled but SMTP config missing"
- Application continues without error

## Logging Details

### Notification_Log Schema
```sql
CREATE TABLE Notification_Log (
  NotificationID BIGSERIAL PRIMARY KEY,
  NotificationType VARCHAR(100) NOT NULL,
  Recipient VARCHAR(255) NOT NULL,
  Subject VARCHAR(500),
  MessageBody TEXT,
  Status VARCHAR(50) NOT NULL CHECK (Status IN ('sent', 'failed', 'skipped')),
  ErrorMessage TEXT,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- `idx_notification_log_type` - Fast filtering by type
- `idx_notification_log_status` - Fast filtering by status
- `idx_notification_log_created` - Chronological queries

## Usage Examples

### Enable Notifications (Windows PowerShell)
```powershell
# Edit .env file
notepad e:\Users\jnorv\green-sourcing-b2b-app\.env

# Add or update:
# NOTIFICATIONS_ENABLED=true
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# FROM_EMAIL=noreply@greenchainz.com

# Restart backend
Push-Location e:\Users\jnorv\green-sourcing-b2b-app
docker-compose restart backend
Pop-Location
```

### Test Email Configuration
```powershell
# Store admin token
$adminToken = "your-admin-jwt-token"

# Send test email
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3001/api/v1/admin/notifications/test" `
  -Headers @{ "Authorization" = "Bearer $adminToken"; "Content-Type" = "application/json" } `
  -Body '{"to":"admin@yourcompany.com"}'

# Check result in logs
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?type=test_email" `
  -Headers @{ "Authorization" = "Bearer $adminToken" }
```

### Monitor Failed Notifications
```powershell
# Get last 20 failed emails
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?status=failed&limit=20" `
  -Headers @{ "Authorization" = "Bearer $adminToken" } | ConvertTo-Json -Depth 3
```

### Audit RFQ Notifications
```powershell
# Get all RFQ-related notifications
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?type=rfq_created" `
  -Headers @{ "Authorization" = "Bearer $adminToken" }
```

## Integration Points

### Existing RFQ Workflow
Notifications are automatically triggered at these points:

1. **POST /api/v1/rfqs** (Buyer sends RFQ)
   - Queries for supplier user email
   - Sends `rfq_created` notification
   - Logs attempt to database

2. **POST /api/v1/rfqs/:id/respond** (Supplier responds)
   - Queries for buyer email from RFQ
   - Sends `rfq_response_received` notification
   - Logs attempt to database

3. **POST /api/v1/rfqs/:rfqId/responses/:responseId/status** (Accept/Decline)
   - Queries for supplier email from response
   - Sends `rfq_response_accepted` or `rfq_response_declined`
   - Logs attempt to database

### Error Handling
- Email failures do NOT break API responses
- Errors logged to console and database
- API returns success even if notification fails
- `try/catch` blocks isolate notification logic

## Swagger UI Integration

### Access Interactive Docs
Navigate to: **http://localhost:3001/docs**

### Features
- Try-it-out interface for all endpoints
- Built-in auth (Bearer token)
- Request/response examples
- Schema definitions

### Raw YAML Spec
- **http://localhost:3001/api/docs** - Returns raw OpenAPI YAML
- Can import into Postman, Insomnia, or code generators

## Security Considerations

### SMTP Credentials
- Store in `.env` file (never commit!)
- Use app-specific passwords (not account passwords)
- Consider environment-based secrets for production

### Admin-Only Endpoints
- Notification log viewing requires Admin role
- Test email endpoint requires Admin role
- JWT validation via `authorizeRoles('Admin')` middleware

### Email Content
- Currently plain text only
- No HTML injection risk
- Recipient addresses pulled from database (not user input)

## Troubleshooting

### "Notifications disabled" in logs
- Set `NOTIFICATIONS_ENABLED=true` in `.env`
- Restart backend after changing env

### "SMTP not configured" in logs
- Verify all SMTP variables set in `.env`
- Check `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

### Emails not arriving
1. Check notification log for failures:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/v1/admin/notifications?status=failed"
   ```
2. Verify SMTP credentials with test endpoint
3. Check spam folder in recipient inbox
4. Verify FROM_EMAIL domain not blacklisted

### Gmail "Less secure app" error
- Enable 2FA on Gmail account
- Generate App Password (do not use account password)
- Use App Password in `SMTP_PASS`

## Future Enhancements

### Planned Features
- [ ] HTML email templates with branding
- [ ] Email preference management (opt-out)
- [ ] Webhook alternatives (Slack, Teams)
- [ ] Scheduled digest emails (daily RFQ summaries)
- [ ] In-app notification center (bell icon)
- [ ] SMS notifications for urgent events

### Extensibility Points
- Add new notification types in `sendEmail` calls
- Extend `Notification_Log` with `UserID` foreign key
- Implement retry logic for transient failures
- Add rate limiting for abuse prevention

## Performance Notes

### Database Impact
- Notification_Log inserts are non-blocking
- Indexes support fast admin queries
- Consider archiving logs older than 90 days

### Email Delivery
- Synchronous (blocks ~100-500ms per email)
- Consider async queue for high volume (Bull, RabbitMQ)
- Current implementation suitable for < 1000 emails/day

### Scaling Recommendations
- For > 1000 emails/day: Use transactional email service (SendGrid, Mailgun)
- For > 10,000 emails/day: Implement job queue with retry logic
- Monitor `Notification_Log` table size, implement log rotation

---

**Last Updated**: 2025-11-08  
**Status**: ✅ Implemented and Tested  
**Dependencies**: nodemailer, swagger-ui-express, PostgreSQL 15
