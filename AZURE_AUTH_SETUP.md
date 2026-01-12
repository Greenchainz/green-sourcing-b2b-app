# Azure AD Authentication Setup for GreenChainz

## 🆕 UPDATED: Direct Microsoft Entra ID Integration (January 2025)

### New Unified Callback Route: `/api/auth/callback`

A new simplified callback route has been created that directly exchanges the authorization code with Microsoft's token endpoint, eliminating the need for intermediate API routes and fixing 500 errors in serverless Azure Container Apps environments.

**File**: `app/api/auth/callback/route.ts`

**Features**:
- ✅ Direct token exchange with Microsoft Entra ID (`login.microsoftonline.com`)
- ✅ No intermediate API routes (fixes serverless issues)
- ✅ Proper URL encoding with `URLSearchParams`
- ✅ Sets secure httpOnly session cookie (`session`)
- ✅ Comprehensive error handling with redirects to login page
- ✅ Support for custom redirect via `next` query parameter

**Required Environment Variables**:
```bash
AZURE_AD_TENANT_ID=your-tenant-id-or-domain.onmicrosoft.com
AZURE_AD_CLIENT_ID=your-application-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
```

**Azure App Registration Configuration**:
- Redirect URI must be set to: `https://your-domain.com/api/auth/callback`
- For local development: `http://localhost:3000/api/auth/callback`

**Flow**:
1. User clicks "Sign in with Microsoft"
2. Redirected to Azure AD login: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
3. After authentication, Azure redirects to: `/api/auth/callback?code=...`
4. Callback route exchanges code for tokens directly with Microsoft
5. Sets session cookies and redirects to dashboard (or custom `next` destination)

---

## Additional Resources

For more details on Azure AD authentication with Next.js:
- [Microsoft Identity Platform Documentation](https://learn.microsoft.com/en-us/azure/active-directory/develop/)
- [NextAuth.js Azure AD Provider](https://next-auth.js.org/providers/azure-ad)
- [Azure Container Apps Authentication](https://learn.microsoft.com/en-us/azure/container-apps/authentication-azure-active-directory)
