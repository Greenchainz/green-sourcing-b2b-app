# NextAuth Authentication System - Deployment & Testing Guide

## Overview
This document provides instructions for deploying and testing the new NextAuth v5 authentication system that replaces the legacy MSAL/Azure AD B2C implementation.

## What Changed

### Removed
- ❌ `@azure/msal-browser` MsalProvider
- ❌ Custom Azure AD B2C flows
- ❌ Manual JWT token management in old `/api/auth/*` routes
- ❌ Custom session stores

### Added
- ✅ NextAuth v5 with unified authentication
- ✅ Prisma adapter with database-backed sessions
- ✅ Multiple OAuth providers (Google, Azure AD, LinkedIn)
- ✅ Credentials provider (email/password)
- ✅ JWT-based sessions with plan/role support
- ✅ Route protection via middleware

## Prerequisites

### 1. Database Setup
The authentication system requires PostgreSQL with the NextAuth tables.

**Apply the migration:**
```bash
psql "$DATABASE_URL" < database-schemas/migrations/20260126_165700_add_nextauth_tables.sql
```

**Verify tables were created:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'accounts', 'sessions', 'verification_tokens');
```

Expected output: 4 tables (users, accounts, sessions, verification_tokens)

### 2. Environment Variables

**Required for all environments:**
```env
# NextAuth Core
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

**OAuth Providers (configure at least one):**

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft Entra ID (Azure AD)
AZURE_AD_CLIENT_ID=your-app-registration-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=common  # or specific tenant ID

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

## OAuth Provider Setup

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to "APIs & Services" > "Credentials"
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://greenchainz.com/api/auth/callback/google`
6. Copy Client ID and Client Secret to environment variables

### Azure AD (Microsoft Entra ID) Setup
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Microsoft Entra ID" > "App registrations"
3. Create new registration or use existing
4. Add redirect URIs under "Authentication":
   - Development: `http://localhost:3000/api/auth/callback/azure-ad`
   - Production: `https://greenchainz.com/api/auth/callback/azure-ad`
5. Generate client secret under "Certificates & secrets"
6. Note the Application (client) ID and Directory (tenant) ID

### LinkedIn OAuth Setup
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Add authorized redirect URLs:
   - Development: `http://localhost:3000/api/auth/callback/linkedin`
   - Production: `https://greenchainz.com/api/auth/callback/linkedin`
4. Copy Client ID and Client Secret

## Testing the Authentication System

### 1. Local Development Testing

**Start the development server:**
```bash
npm install
npm run dev
```

**Test email/password login:**
1. Visit `http://localhost:3000/signup`
2. Create a new account with email/password
3. Verify user is created in database:
   ```sql
   SELECT id, email, name, plan, role FROM users;
   ```
4. Visit `http://localhost:3000/login`
5. Sign in with the credentials
6. Verify you're redirected to `/dashboard`

**Test OAuth providers:**
1. Visit `http://localhost:3000/login`
2. Click "Google" / "Microsoft" / "LinkedIn" button
3. Complete OAuth flow
4. Verify:
   - User is created in `users` table
   - Account link is created in `accounts` table
   - Session is created in `sessions` table

### 2. Session Verification

**Check session in browser:**
```javascript
// In browser console
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log)
```

Expected response:
```json
{
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "name": "John Doe",
    "plan": "free",
    "role": "user"
  },
  "expires": "2026-02-25T..."
}
```

### 3. Middleware Protection Testing

**Test protected routes:**
```bash
# Should redirect to /login if not authenticated
curl -I http://localhost:3000/dashboard

# Should return 200 if authenticated (with cookie)
curl -I http://localhost:3000/dashboard -H "Cookie: next-auth.session-token=..."
```

**Protected routes (defined in middleware.ts):**
- `/dashboard/*`
- `/suppliers/*`
- `/architects/*`
- `/api/communications/*`
- `/api/support/*`
- `/api/rfq/*`

### 4. Database Verification

**Check user creation:**
```sql
SELECT 
  u.id, u.email, u.name, u.plan, u.role, u."createdAt",
  COUNT(a.id) as oauth_accounts,
  COUNT(s.id) as active_sessions
FROM users u
LEFT JOIN accounts a ON u.id = a."userId"
LEFT JOIN sessions s ON u.id = s."userId" AND s.expires > NOW()
GROUP BY u.id;
```

**Check OAuth accounts:**
```sql
SELECT 
  a.provider, a."providerAccountId", 
  u.email, u.name
FROM accounts a
JOIN users u ON a."userId" = u.id;
```

## Production Deployment

### Azure Container Apps Configuration

**Set environment variables in Azure Portal:**
```bash
# Container App > Settings > Environment variables

# Core
NEXTAUTH_URL=https://greenchainz.com
NEXTAUTH_SECRET=<from-key-vault>
DATABASE_URL=<from-key-vault>

# OAuth (store secrets in Key Vault)
GOOGLE_CLIENT_ID=<value>
GOOGLE_CLIENT_SECRET=<from-key-vault>
AZURE_AD_CLIENT_ID=<value>
AZURE_AD_CLIENT_SECRET=<from-key-vault>
AZURE_AD_TENANT_ID=<tenant-id>
LINKEDIN_CLIENT_ID=<value>
LINKEDIN_CLIENT_SECRET=<from-key-vault>
```

**Update OAuth redirect URIs to production:**
- Google: `https://greenchainz.com/api/auth/callback/google`
- Azure AD: `https://greenchainz.com/api/auth/callback/azure-ad`
- LinkedIn: `https://greenchainz.com/api/auth/callback/linkedin`

### Post-Deployment Verification

**1. Health check:**
```bash
curl https://greenchainz.com/api/health
```

**2. Test authentication flow:**
1. Visit `https://greenchainz.com/login`
2. Test each OAuth provider
3. Test email/password login
4. Verify sessions persist across requests

**3. Monitor logs:**
```bash
# Azure CLI
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group greenchainz-production \
  --follow
```

## Troubleshooting

### Issue: "Prisma Client is not configured"
**Solution:** Ensure DATABASE_URL is set and Prisma client is generated
```bash
npx prisma generate
```

### Issue: "NEXTAUTH_SECRET must be provided"
**Solution:** Set NEXTAUTH_SECRET environment variable
```bash
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### Issue: OAuth redirect mismatch
**Solution:** Ensure redirect URIs in OAuth provider match exactly
- Development: `http://localhost:3000/api/auth/callback/{provider}`
- Production: `https://greenchainz.com/api/auth/callback/{provider}`

### Issue: Session not persisting
**Solution:** Check that:
1. Database connection is working
2. `sessions` table exists
3. Cookies are not blocked by browser
4. NEXTAUTH_URL matches the actual domain

### Issue: "Cannot find module '@/lib/prisma'"
**Solution:** Ensure the build includes lib/prisma.ts and prisma client is generated

## API Endpoints

### NextAuth Routes (auto-generated)
- `GET/POST /api/auth/callback/{provider}` - OAuth callbacks
- `GET /api/auth/signin` - Sign in page
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session
- `GET /api/auth/csrf` - CSRF token
- `GET /api/auth/providers` - List configured providers

### Custom Routes (if needed)
You can add custom authentication logic by creating API routes that use the `auth()` function:

```typescript
// app/api/custom-auth/route.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Your custom logic here
  return NextResponse.json({ data: "..." });
}
```

## Migration from Old System

### For Existing Users
The new `users` table is separate from the old `Users` table (case-sensitive). To migrate existing users:

```sql
-- Example migration (customize as needed)
INSERT INTO users (id, email, name, plan, role, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  "Email",
  "FullName",
  'free',
  CASE "Role"
    WHEN 'Supplier' THEN 'supplier'
    WHEN 'Admin' THEN 'admin'
    ELSE 'user'
  END,
  "CreatedAt",
  "UpdatedAt"
FROM "Users"
WHERE "Email" IS NOT NULL
ON CONFLICT (email) DO NOTHING;
```

### For OAuth Users
OAuth users will be automatically migrated on first login with the new system.

## Security Considerations

### Production Checklist
- [ ] NEXTAUTH_SECRET is strong (32+ characters, random)
- [ ] DATABASE_URL uses SSL/TLS (`?sslmode=require`)
- [ ] OAuth secrets stored in Azure Key Vault
- [ ] Redirect URIs use HTTPS in production
- [ ] NEXTAUTH_URL matches actual domain
- [ ] Rate limiting configured for auth endpoints
- [ ] Session max age reviewed (currently 30 days)
- [ ] CORS configuration reviewed
- [ ] Cookie settings reviewed (secure, httpOnly, sameSite)

### Known Limitations
1. **allowDangerousEmailAccountLinking: true**
   - Allows same email across multiple OAuth providers
   - Risk: Account takeover if email compromised
   - Mitigation: Email verification recommended

2. **bcryptjs in Edge Runtime**
   - Warning about Node.js modules in Edge Runtime
   - Impact: None (only used in API routes, not middleware)

3. **Deprecated useAuth hook**
   - Some pages still use old useAuth pattern
   - Impact: Works via compatibility stub
   - Recommendation: Migrate to useSession from next-auth/react

## Support

For issues or questions:
1. Check [NextAuth.js documentation](https://next-auth.js.org/)
2. Review [Prisma documentation](https://www.prisma.io/docs)
3. Check Azure Container Apps logs
4. Review this repository's issues

---

**Last Updated:** 2026-01-26  
**NextAuth Version:** 5.0.0-beta.30  
**Prisma Version:** 5.22.0
