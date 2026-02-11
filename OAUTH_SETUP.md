# OAuth Setup Guide for GreenChainz B2B App

This guide will walk you through setting up Google, Microsoft, and LinkedIn OAuth authentication for the GreenChainz B2B application.

## Prerequisites

- Node.js 20+ installed
- Access to Google Cloud Console, Azure Portal, and LinkedIn Developer Portal
- A deployed version of your app (or use `http://localhost:3000` for local testing)

## Step 1: Generate NextAuth Secret

```bash
openssl rand -base64 32
```

Copy the output and add it to your `.env.local` file:

```
NEXTAUTH_SECRET=your-generated-secret-here
```

## Step 2: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: GreenChainz
   - User support email: your-email@greenchainz.com
   - Developer contact: your-email@greenchainz.com
6. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: GreenChainz B2B App
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local development)
     - `https://your-production-domain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://your-production-domain.com/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**
8. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

## Step 3: Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - Name: GreenChainz B2B App
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI:
     - Platform: **Web**
     - URI: `http://localhost:3000/api/auth/callback/microsoft` (add production URL later)
5. Click **Register**
6. Copy the **Application (client) ID** from the Overview page
7. Navigate to **Certificates & secrets** → **Client secrets**
8. Click **New client secret**
   - Description: NextAuth Secret
   - Expires: 24 months (or your preference)
9. Copy the **Value** (this is your client secret - you won't be able to see it again!)
10. Navigate to **API permissions**
    - Click **Add a permission** → **Microsoft Graph** → **Delegated permissions**
    - Add: `openid`, `profile`, `email`, `User.Read`
    - Click **Add permissions**
11. Add to `.env.local`:
    ```
    MICROSOFT_CLIENT_ID=your-microsoft-client-id
    MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
    ```

## Step 4: LinkedIn OAuth Setup

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in the details:
   - App name: GreenChainz B2B App
   - LinkedIn Page: (select your company page or create one)
   - App logo: Upload your GreenChainz logo
   - Legal agreement: Check the box
4. Click **Create app**
5. Navigate to the **Auth** tab
6. Under **OAuth 2.0 settings**:
   - Authorized redirect URLs:
     - `http://localhost:3000/api/auth/callback/linkedin`
     - `https://your-production-domain.com/api/auth/callback/linkedin`
7. Under **Application credentials**:
   - Copy the **Client ID**
   - Copy the **Client Secret**
8. Navigate to the **Products** tab
9. Request access to **Sign In with LinkedIn using OpenID Connect**
10. Add to `.env.local`:
    ```
    LINKEDIN_CLIENT_ID=your-linkedin-client-id
    LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
    ```

## Step 5: Configure Environment Variables

Create a `.env.local` file in the root of your project (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Fill in all the values:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-from-step-1

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

## Step 6: Test Locally

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Navigate to `http://localhost:3000/login`

4. Test each OAuth provider:
   - Click "Continue with Google" → should redirect to Google login
   - Click "Continue with Microsoft" → should redirect to Microsoft login
   - Click "Continue with LinkedIn" → should redirect to LinkedIn login

5. After successful authentication, you should be redirected to `/dashboard`

## Step 7: Production Deployment

When deploying to production:

1. Update all OAuth provider redirect URIs to include your production domain
2. Set environment variables in your hosting platform (Azure, Vercel, etc.)
3. Update `NEXTAUTH_URL` to your production domain
4. Test all OAuth flows in production

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in your OAuth provider settings EXACTLY matches the one in your app
- Format: `https://your-domain.com/api/auth/callback/{provider}`
- No trailing slashes!

### "Invalid client secret" error
- Double-check you copied the client secret correctly
- For Microsoft: Make sure you copied the **Value**, not the **Secret ID**
- Regenerate the secret if needed

### OAuth provider not showing up
- Check that the provider is properly configured in `auth.ts`
- Verify environment variables are set correctly
- Restart your development server after changing `.env.local`

### Session not persisting
- Make sure `NEXTAUTH_SECRET` is set
- Check browser cookies are enabled
- Verify the `NEXTAUTH_URL` matches your current domain

## Security Best Practices

1. **Never commit `.env.local`** to version control (it's in `.gitignore`)
2. **Rotate secrets regularly** (every 6-12 months)
3. **Use different credentials** for development and production
4. **Enable MFA** on all OAuth provider accounts
5. **Monitor OAuth usage** in provider dashboards for suspicious activity

## Next Steps

After OAuth is working:

1. Customize the login page design to match your brand
2. Add user profile management
3. Implement role-based access control (RBAC)
4. Set up session management and logout
5. Add email notifications for new logins

## Support

If you encounter issues:
- Check the [NextAuth.js documentation](https://next-auth.js.org/)
- Review provider-specific OAuth documentation
- Check the browser console and server logs for errors
- Reach out to the GreenChainz development team

---

**Last Updated**: February 2026
