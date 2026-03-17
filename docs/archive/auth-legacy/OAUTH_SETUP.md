# OAuth Setup Guide for GreenChainz

This guide explains how to set up OAuth social login for the GreenChainz B2B platform. We support Google, Facebook, LinkedIn, and GitHub authentication.

## Overview

The OAuth implementation allows users to:
1. **Sign in** with existing social accounts (reduces friction)
2. **Capture emails** on survey pages before full registration
3. **Auto-create** user accounts when they authenticate via OAuth

All OAuth flows redirect to the frontend (`http://localhost:5173/auth/success?token=JWT_TOKEN`) after successful authentication, where the frontend can extract and store the JWT token.

---

## 1. Google OAuth Setup

### Steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Configure consent screen if prompted:
   - User Type: External
   - App name: GreenChainz
   - Support email: your-email@example.com
   - Scopes: `email`, `profile`, `openid`
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: GreenChainz Backend
   - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
   - For production, add: `https://yourdomain.com/auth/google/callback`
7. Copy the **Client ID** and **Client Secret**

### Add to `.env`:
```bash
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

### Test:
Navigate to `http://localhost:3001/auth/google` - should redirect to Google login.

---

## 2. Facebook OAuth Setup

### Steps:
1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Click **Create App**
3. Select **Consumer** as app type
4. Fill in app details:
   - App name: GreenChainz
   - Contact email: your-email@example.com
5. In the app dashboard, add **Facebook Login** product
6. Go to **Facebook Login > Settings**
7. Add **Valid OAuth Redirect URIs**: `http://localhost:3001/auth/facebook/callback`
8. Go to **Settings > Basic** to find your **App ID** and **App Secret**
9. Add `email` permission:
   - Go to **App Review > Permissions and Features**
   - Request `email` permission (should be auto-approved for development)

### Add to `.env`:
```bash
FACEBOOK_APP_ID=1234567890123456
FACEBOOK_APP_SECRET=abcdef1234567890abcdef1234567890
FACEBOOK_CALLBACK_URL=http://localhost:3001/auth/facebook/callback
```

### Test:
Navigate to `http://localhost:3001/auth/facebook` - should redirect to Facebook login.

---

## 3. LinkedIn OAuth Setup

### Steps:
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in required fields:
   - App name: GreenChainz
   - LinkedIn Page: Create or link a company page
   - Privacy policy URL: https://yourdomain.com/privacy (can use placeholder for dev)
   - App logo: Upload your logo
4. After creating, go to **Auth** tab
5. Add **Redirect URLs**: `http://localhost:3001/auth/linkedin/callback`
6. Under **Products**, add **Sign In with LinkedIn using OpenID Connect**
7. Go to **Auth** tab to find:
   - **Client ID**
   - **Client Secret** (click "Show" to reveal)
8. Note: LinkedIn requires `openid`, `profile`, and `email` scopes

### Add to `.env`:
```bash
LINKEDIN_CLIENT_ID=86abc123def456gh
LINKEDIN_CLIENT_SECRET=AbCdEf123456
LINKEDIN_CALLBACK_URL=http://localhost:3001/auth/linkedin/callback
```

### Test:
Navigate to `http://localhost:3001/auth/linkedin` - should redirect to LinkedIn login.

---

## 4. GitHub OAuth Setup

### Steps:
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in application details:
   - Application name: GreenChainz
   - Homepage URL: `http://localhost:3001`
   - Authorization callback URL: `http://localhost:3001/auth/github/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it immediately (only shown once)
7. Note: GitHub requires `user:email` scope to access email addresses

### Add to `.env`:
```bash
GITHUB_CLIENT_ID=Iv1.abc123def456
GITHUB_CLIENT_SECRET=ghp_1234567890abcdefghijklmnopqrstuvwxyz
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
```

### Test:
Navigate to `http://localhost:3001/auth/github` - should redirect to GitHub login.

---

## 5. Session Secret

Generate a random session secret for Passport.js session management:

```bash
# On Linux/macOS:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Add to `.env`:
```bash
SESSION_SECRET=your-generated-random-string-min-32-chars
```

---

## 6. Database Setup

The OAuth implementation requires the modified `Users` table with OAuth fields:

```sql
-- Users table with OAuth support
CREATE TABLE Users (
  UserID BIGSERIAL PRIMARY KEY,
  Email VARCHAR(255),  -- Nullable for OAuth users
  PasswordHash VARCHAR(255),  -- Nullable for OAuth users
  Role VARCHAR(50) DEFAULT 'Buyer',
  CompanyID BIGINT,
  OAuthProvider VARCHAR(50),  -- 'google', 'facebook', 'linkedin', 'github'
  OAuthID VARCHAR(255),  -- Provider's unique user ID
  FullName VARCHAR(255),
  LastLogin TIMESTAMP,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT oauth_unique UNIQUE (OAuthProvider, OAuthID)
);

-- Email Captures table (for survey waitlist)
CREATE TABLE Email_Captures (
  CaptureID BIGSERIAL PRIMARY KEY,
  Email VARCHAR(255) NOT NULL,
  Source VARCHAR(100) NOT NULL CHECK (Source IN ('supplier-survey', 'buyer-survey', 'data-provider-survey', 'newsletter', 'waitlist')),
  UserType VARCHAR(50),
  CompanyName VARCHAR(255),
  CapturedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_captures_unique UNIQUE (Email, Source)
);
```

Run the schema migration:
```bash
# Start the database
docker compose up -d

# Apply the schema (backend automatically applies on startup)
cd backend
node index.js
```

---

## 7. Testing OAuth Flow

### Full OAuth Test Checklist:

1. **Start the database**:
   ```bash
   docker compose up -d
   docker ps  # Verify greenchainz_db is running
   ```

2. **Start the backend**:
   ```bash
   cd backend
   npm install
   node index.js
   ```
   Should see: `✅ Database schema ensured.` and `Backend server listening at http://localhost:3001`

3. **Test each OAuth provider**:
   
   **Google:**
   - Navigate to `http://localhost:3001/auth/google`
   - Should redirect to Google login
   - After login, redirects to `http://localhost:5173/auth/success?token=JWT_TOKEN`
   
   **Facebook:**
   - Navigate to `http://localhost:3001/auth/facebook`
   - Should redirect to Facebook login
   - After login, redirects to frontend with JWT token
   
   **LinkedIn:**
   - Navigate to `http://localhost:3001/auth/linkedin`
   - Should redirect to LinkedIn authorization
   - After authorization, redirects to frontend with JWT token
   
   **GitHub:**
   - Navigate to `http://localhost:3001/auth/github`
   - Should redirect to GitHub authorization
   - After authorization, redirects to frontend with JWT token

4. **Verify database entries**:
   ```bash
   docker exec -it greenchainz_db psql -U user -d greenchainz_dev
   ```
   ```sql
   -- Check created users
   SELECT UserID, Email, OAuthProvider, OAuthID, FullName, Role, LastLogin 
   FROM Users 
   WHERE OAuthProvider IS NOT NULL;
   
   -- Check email captures
   SELECT * FROM Email_Captures ORDER BY CapturedAt DESC;
   ```

5. **Test email capture form**:
   - Go to `http://localhost:3001/surveys/supplier`
   - Enter email in "Get Early Access" form
   - Click submit
   - Should see green success message: "✓ Thank you! We'll be in touch soon."
   - Verify in database with query above

---

## 8. Frontend Integration

The frontend needs to handle the OAuth redirect and JWT token:

### Create `/auth/success` route:
```javascript
// In your React router (e.g., src/App.jsx)
import { useNavigate, useSearchParams } from 'react-router-dom';

function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Store JWT token
      localStorage.setItem('authToken', token);
      
      // Optionally decode to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Logged in as:', payload.email, payload.role);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } else {
      // OAuth failed
      navigate('/login?error=oauth_failed');
    }
  }, [searchParams, navigate]);
  
  return <div>Processing login...</div>;
}
```

### Add route:
```javascript
<Route path="/auth/success" element={<AuthSuccess />} />
```

---

## 9. Production Deployment Checklist

Before deploying to production:

- [ ] Update all callback URLs to production domain (`https://yourdomain.com`)
- [ ] Generate new production secrets (JWT_SECRET, SESSION_SECRET)
- [ ] Set `NODE_ENV=production` in environment
- [ ] Enable `secure: true` for session cookies (requires HTTPS)
- [ ] Set `sameSite: 'strict'` for session cookies
- [ ] Configure CORS to only allow your frontend domain
- [ ] Add rate limiting to OAuth routes
- [ ] Review and approve OAuth app permissions with each provider
- [ ] Set up domain verification for Google OAuth (if using Gmail addresses)
- [ ] Test OAuth flow on production domain before launch
- [ ] Monitor OAuth errors in logs
- [ ] Set up analytics to track OAuth conversion rates

---

## 10. Troubleshooting

### Common Issues:

**Error: "redirect_uri_mismatch"**
- **Cause**: Callback URL in .env doesn't match OAuth app settings
- **Fix**: Ensure exact match (including http/https, trailing slash)

**Error: "invalid_client"**
- **Cause**: Wrong Client ID or Client Secret
- **Fix**: Double-check credentials from provider dashboard

**Error: "access_denied"**
- **Cause**: User declined permissions or app not approved
- **Fix**: Check app review status, ensure required permissions are approved

**Error: "ECONNREFUSED"**
- **Cause**: Database not running
- **Fix**: `docker compose up -d`

**Session issues: "Failed to serialize user"**
- **Cause**: Missing SESSION_SECRET or session middleware not configured
- **Fix**: Add SESSION_SECRET to .env, restart backend

**GitHub doesn't return email**
- **Cause**: User's GitHub email is private
- **Fix**: Code already handles this by using `username@users.noreply.github.com`

**LinkedIn asks for company page**
- **Cause**: LinkedIn requires company page for OAuth apps
- **Fix**: Create a LinkedIn company page (can be minimal for dev testing)

---

## 11. Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Rotate secrets regularly** in production
3. **Use HTTPS in production** - Required for secure cookies
4. **Validate OAuth state parameter** - Prevents CSRF (Passport.js handles this)
5. **Limit OAuth scopes** - Only request necessary permissions
6. **Monitor failed login attempts** - Set up alerts for unusual activity
7. **Implement rate limiting** - Prevent brute force attacks
8. **Use short-lived JWT tokens** - Consider 1-hour expiry with refresh tokens
9. **Store tokens securely** - Use httpOnly cookies instead of localStorage in production
10. **Log OAuth events** - Track successful/failed authentications

---

## Support

For issues or questions:
- Check the [Passport.js documentation](http://www.passportjs.org/)
- Review provider-specific docs:
  - [Google OAuth](https://developers.google.com/identity/protocols/oauth2)
  - [Facebook Login](https://developers.facebook.com/docs/facebook-login/)
  - [LinkedIn OAuth](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
  - [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- Open an issue in the repository

---

**Last Updated**: 2025-11-05  
**Version**: 1.0.0
