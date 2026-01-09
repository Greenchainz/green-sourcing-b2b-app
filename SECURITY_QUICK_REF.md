# Security Fixes - Quick Reference

## For Backend Developers

### 1. Using Rate Limiters

Import available rate limiters from middleware:

```javascript
const { general, auth, ai, upload, webhook } = require('../middleware/rateLimit');

// Apply to route
router.post('/expensive-operation', authenticateToken, ai, async (req, res) => {
  // Handler code
});
```

**Available Rate Limiters:**
- `general` - 100 req/min - Default API endpoints
- `auth` - 10 req/min - Authentication endpoints
- `ai` - 20 req/15min - AI operations (expensive)
- `upload` - 10 req/5min - File uploads
- `webhook` - 100 req/min - External webhooks
- `health` - 200 req/min - Health checks
- `revit` - 30 req/min - Revit integration

### 2. Safe Logging

Always sanitize user input in logs:

```javascript
const { sanitizeForLog } = require('../utils/sanitize');

// ❌ UNSAFE
console.log(`User ${userId} performed action`);

// ✅ SAFE
console.log('User', sanitizeForLog(userId), 'performed action');
```

### 3. SQL Queries

Always use parameterized queries:

```javascript
// ✅ SAFE - Parameterized query
const result = await pool.query(
  'SELECT * FROM Users WHERE UserID = $1 AND Email = $2',
  [userId, email]
);

// ❌ UNSAFE - String concatenation
const result = await pool.query(
  `SELECT * FROM Users WHERE UserID = '${userId}'`
);
```

### 4. Input Validation

Use sanitization utilities:

```javascript
const { sanitizeUUID, sanitizeEmail, sanitizeForDB } = require('../utils/sanitize');

try {
  const validUUID = sanitizeUUID(req.params.id);
  const validEmail = sanitizeEmail(req.body.email);
  const validInput = sanitizeForDB(req.body.text, { maxLength: 500 });
} catch (error) {
  return res.status(400).json({ error: error.message });
}
```

---

## For Frontend Developers

### 1. CSRF Token

Fetch and include CSRF token in all POST/PUT/DELETE requests:

```javascript
// 1. Fetch token on app initialization
const response = await fetch('/api/v1/csrf-token', {
  headers: { 'Authorization': `Bearer ${authToken}` }
});
const { csrfToken } = await response.json();

// 2. Include in state-changing requests
await fetch('/api/v1/rfqs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(rfqData)
});
```

### 2. Rate Limit Handling

Handle 429 responses gracefully:

```javascript
const response = await fetch('/api/v1/ai-gateway/carbon-estimate', {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify(data)
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  // Show user message: "Too many requests. Please wait ${retryAfter} seconds."
  // Implement exponential backoff or disable button temporarily
}
```

### 3. Rate Limit Headers

Check rate limit status before expensive operations:

```javascript
const response = await fetch('/api/v1/ai-gateway/compliance-check', {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify(data)
});

const remaining = response.headers.get('X-RateLimit-Remaining');
const limit = response.headers.get('X-RateLimit-Limit');
const reset = response.headers.get('X-RateLimit-Reset');

// Show user: "You have ${remaining}/${limit} AI requests remaining"
```

---

## Environment Variables

### Required (Production)

```bash
NODE_ENV=production
JWT_SECRET=<min-32-chars-random-string>
SESSION_SECRET=<min-32-chars-random-string>
COOKIE_SECRET=<min-32-chars-random-string>
DATABASE_URL=postgres://user:pass@host:5432/db
FRONTEND_URL=https://app.greenchainz.com
```

### Optional (Rate Limiting)

```bash
# Use Redis for distributed rate limiting (recommended for multi-container)
REDIS_HOST=greenchainz-redis.redis.cache.windows.net
REDIS_PASSWORD=<azure-redis-key>

# Customize rate limits (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Testing Security Features

### Test Rate Limiting

```bash
# Health endpoint (200 req/min limit)
for i in {1..210}; do 
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/health
done

# Expected: First 200 return 200, next 10 return 429
```

### Test CSRF Protection

```bash
# 1. Should fail without CSRF token
curl -X POST http://localhost:3001/api/v1/rfqs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
# Expected: 403 Forbidden

# 2. Should succeed with CSRF token
CSRF=$(curl -s http://localhost:3001/api/v1/csrf-token \
  -H "Authorization: Bearer $TOKEN" | jq -r '.csrfToken')

curl -X POST http://localhost:3001/api/v1/rfqs \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
# Expected: 201 Created
```

### Test Format String Sanitization

```javascript
// In Node.js console
const { sanitizeForLog } = require('./backend/utils/sanitize');

// Test 1: Format specifiers removed
sanitizeForLog('%s%d%n%x');
// Returns: '' (empty string)

// Test 2: Control characters removed
sanitizeForLog('user\x00\x01\x02data');
// Returns: 'userdata'

// Test 3: Long strings truncated
sanitizeForLog('a'.repeat(2000));
// Returns: 'aaa...aaa (truncated)' (max 1000 chars)
```

---

## Common Issues

### Issue: CSRF token not working

**Solution:**
1. Ensure you're fetching token from `/api/v1/csrf-token`
2. Check token is included in header: `X-CSRF-Token: <token>`
3. Verify authentication token is valid
4. Token expires with session - refresh if needed

### Issue: Rate limit too strict

**Solution:**
1. Check which rate limiter is applied to endpoint
2. Review Application Insights for actual usage patterns
3. Adjust rate limits in `backend/middleware/rateLimit.js`
4. Ensure Redis is configured for multi-container deployments

### Issue: SQL injection false positive

**Solution:**
1. Verify query uses parameterized syntax: `$1, $2, $3`
2. Never concatenate user input into SQL strings
3. Use `sanitizeForDB()` for additional validation
4. Run CodeQL scan to verify no issues

---

## Code Review Checklist

### Before Merging

- [ ] All new endpoints have rate limiting
- [ ] POST/PUT/DELETE routes work with CSRF protection
- [ ] No string interpolation in console.log with user input
- [ ] All SQL queries use parameterized syntax (`$1, $2, etc`)
- [ ] Input validation for all user-provided data
- [ ] Error messages don't leak sensitive information
- [ ] Security tests passing

### Rate Limiting

- [ ] Appropriate rate limiter selected for endpoint purpose
- [ ] Expensive operations (AI, uploads) use strict limits
- [ ] Public endpoints have basic protection
- [ ] Internal endpoints use internal API key middleware

### CSRF Protection

- [ ] State-changing endpoints protected by default
- [ ] Webhooks explicitly excluded from CSRF
- [ ] Frontend updated to include CSRF token
- [ ] Error handling for 403 CSRF failures

### Logging & Monitoring

- [ ] All logs use `sanitizeForLog()` for user input
- [ ] No sensitive data in logs (passwords, tokens, etc)
- [ ] Application Insights tracking security events
- [ ] Rate limit violations monitored

---

## Need Help?

- **Security issues:** Review `SECURITY_FIXES_SUMMARY.md`
- **Implementation:** Check source code in `backend/middleware/rateLimit.js` and `backend/utils/sanitize.js`
- **Testing:** See test examples in this document
- **Deployment:** Refer to `.env.example` and Azure deployment docs

**Status:** ✅ All 130+ CodeQL security vulnerabilities resolved
