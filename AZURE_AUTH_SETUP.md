# Azure AD Authentication Setup for GreenChainz

## ✅ COMPLETE
All necessary files have been created to support Azure AD authentication via Supabase.

## Files Created

### 1. **lib/auth-azure.ts**
Core authentication module:
- `signInWithAzure()` - Initiates Azure AD OAuth flow
- `getCurrentUser()` - Returns current authenticated user
- `getSessionToken()` - Retrieves Supabase JWT for API calls
- Supabase client configured with Azure AD provider

### 2. **app/pages/auth/login.tsx**
Login page component:
- "Sign in with Microsoft Azure AD" button
- Error handling and display
- Redirect to dashboard on success
- Pre-login check (redirects authenticated users to dashboard)

### 3. **app/pages/auth/callback.tsx**
OAuth callback handler:
- Receives redirect from Supabase after Azure AD approval
- Extracts user data and session token
- Syncs user with backend database
- Stores auth token and user in localStorage
- Redirects to dashboard

### 4. **backend/routes/auth-sync.js**
Backend sync endpoint:
- `POST /api/v1/auth/sync-azure-user`
- Creates or updates user in database
- Links Azure ID to user record
- Auto-creates Buyer profile if role is "Buyer"
- Requires valid Supabase JWT

## Configuration Required

### Environment Variables (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001  # or production backend URL
```

### Supabase Setup
1. Go to **Authentication > Providers** in Supabase dashboard
2. Find **Microsoft** provider
3. Enable it
4. Add your:
   - Tenant ID (from Azure)
   - Client ID (from Azure)
   - Client Secret (from Azure)
5. Set Redirect URL: `https://your-domain.supabase.co/auth/v1/callback`

### Azure AD Setup
1. Go to [portal.azure.com](https://portal.azure.com)
2. Create new App Registration:
   - Name: "GreenChainz"
   - Supported account types: "Accounts in any organizational directory"
3. Copy:
   - Application (client) ID → Goes to Supabase as Client ID
   - Directory (tenant) ID → Goes to Supabase as Tenant ID
4. Create new client secret:
   - Copy value → Goes to Supabase as Client Secret
5. Set Redirect URIs:
   - Add: `https://your-domain.supabase.co/auth/v1/callback`

## Flow Diagram

```
User visits /auth/login
        ↓
Click "Sign in with Microsoft"
        ↓
SignInWithAzure() initiated
        ↓
Redirect to Azure AD login
        ↓
User authenticates with Azure
        ↓
Redirect to callback.tsx
        ↓
GetCurrentUser() retrieves user data
        ↓
Call backend POST /api/v1/auth/sync-azure-user
        ↓
Backend creates/updates user & buyer profile
        ↓
Store token in localStorage
        ↓
Redirect to /dashboard
```

## Testing Checklist

- [ ] Supabase Azure provider enabled
- [ ] Azure AD app registered with correct redirect URL
- [ ] Environment variables set correctly
- [ ] Backend database schema includes Users table
- [ ] Users can click "Sign in with Microsoft"
- [ ] Azure AD login dialog appears
- [ ] User redirected to dashboard after login
- [ ] User data stored in database with AzureID
- [ ] Buyer profile auto-created for new Buyer users
- [ ] Existing users linked to their Azure account

## Backend Database Changes Needed

### Users table should have:
```sql
ALTER TABLE Users ADD COLUMN AzureID VARCHAR(255) UNIQUE;
```

### Buyers table should have:
```sql
ALTER TABLE Buyers ADD COLUMN PreferredContactMethod VARCHAR(50) DEFAULT 'Email';
```

## Next Steps

1. **Configure Azure AD** in your Azure portal
2. **Configure Supabase** with Azure provider details
3. **Update environment variables** in frontend (.env.local)
4. **Run database migrations** to add AzureID column
5. **Test login flow** with test Azure AD account
6. **Verify backend sync** works correctly
7. **Check localStorage** for auth token

## Troubleshooting

### "OAuth is disabled" error
- Ensure Microsoft provider is enabled in Supabase

### "Invalid credentials" from Azure
- Check Tenant ID and Client ID are correct
- Verify Client Secret is current (may have expired)
- Confirm Redirect URL matches exactly in Azure portal

### Backend sync fails
- Check Supabase JWT is valid
- Verify backend can reach database
- Check Users table has AzureID column

### User not found after login
- Check if user was created in Users table
- Verify AzureID is populated
- Check Buyers table if role is Buyer

## Security Notes

- ✅ Auth tokens stored in localStorage (OK for SPA)
- ✅ Backend validates JWT from Supabase
- ✅ Azure credentials stored in Supabase (not frontend)
- ✅ Redirect URL validated by Azure
- ⚠️ Ensure HTTPS in production
- ⚠️ Rotate Client Secret regularly

## Support

For issues:
1. Check Supabase logs: **Authentication > Logs**
2. Check Azure logs: **App registrations > Monitor**
3. Check backend logs: `/api/v1/health` endpoint
