# Supabase OAuth Setup Guide

Your backend is now integrated with **Supabase Auth** for OAuth authentication. Follow these steps to enable Google, GitHub, LinkedIn, and Microsoft (Azure) login.

## What Changed

- ✅ Login.tsx now uses `supabase.auth.signInWithOAuth()`
- ✅ AuthContext uses Supabase session management instead of custom JWT
- ✅ AuthCallback handles Supabase OAuth redirects
- ✅ No separate Node.js backend needed for OAuth

## Required Environment Variables in Vercel

Add these in your Vercel project settings:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these from your Supabase project dashboard: **Settings → API**

## Enable OAuth Providers in Supabase

### 1. Google OAuth

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → **Authentication → Providers**
2. Find **Google** and click **Enable**
3. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/):
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret**
4. Paste them into Supabase Google provider settings
5. Click **Save**

### 2. GitHub OAuth

1. In Supabase, enable **GitHub** provider
2. Create OAuth app at [GitHub Developer Settings](https://github.com/settings/developers):
   - Click **New OAuth App**
   - Application name: `GreenChainz`
   - Homepage URL: `https://www.greenchainz.com`
   - Authorization callback URL:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy **Client ID** and generate **Client Secret**
3. Paste them into Supabase GitHub provider settings
4. Click **Save**

### 3. LinkedIn (OIDC) OAuth

1. In Supabase, enable **LinkedIn (OIDC)** provider
2. Create OAuth app at [LinkedIn Developers](https://www.linkedin.com/developers/apps):
   - Click **Create app**
   - Fill in app details
   - In **Auth** tab, add **Redirect URL**:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret** from **Auth** tab
3. Paste them into Supabase LinkedIn provider settings
4. Click **Save**

### 4. Microsoft (Azure) OAuth

1. In Supabase, enable **Azure (Microsoft)** provider
2. Create app registration at [Azure Portal](https://portal.azure.com/):
   - Go to **Azure Active Directory → App registrations**
   - Click **New registration**
   - Name: `GreenChainz`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI:
     - Platform: **Web**
     - URI: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy **Application (client) ID**
   - Go to **Certificates & secrets** → Create new client secret
   - Copy the secret **value** (not the ID)
3. Paste **Client ID** and **Client Secret** into Supabase Azure provider settings
4. Click **Save**

## Update Redirect URLs After Vercel Deployment

After deploying to Vercel, you need to update the redirect URLs in each OAuth provider:

### In Supabase (for all providers):
1. Go to **Authentication → URL Configuration**
2. Add your Vercel domain to **Site URL**: `https://your-vercel-app.vercel.app`
3. Add redirect URL to **Redirect URLs**: `https://your-vercel-app.vercel.app/auth/callback`

### In Each OAuth Provider Console:
Update the authorized redirect URIs to include **both**:
- `https://your-project-ref.supabase.co/auth/v1/callback` (Supabase)
- `https://your-vercel-app.vercel.app/auth/callback` (optional, for direct app redirects)

**Note:** The Supabase callback URL is the primary one that handles OAuth.

## Testing OAuth Flow

1. Deploy to Vercel (already done automatically)
2. Add environment variables in Vercel dashboard
3. Redeploy (triggers automatically after env var changes)
4. Enable OAuth providers in Supabase
5. Visit `https://your-vercel-app.vercel.app/login`
6. Click any OAuth button
7. Should redirect to provider → authenticate → redirect to `/auth/callback` → redirect to `/dashboard/architect`

## Troubleshooting

### "Invalid redirect URI"
- Check that Supabase callback URL is added to OAuth provider settings
- Format: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`

### "OAuth provider not enabled"
- Verify provider is enabled in Supabase dashboard
- Check Client ID and Secret are correctly pasted

### "Session not found" after OAuth
- Check Supabase URL and anon key in Vercel environment variables
- Verify Site URL in Supabase matches your Vercel domain

### Redirect to login instead of dashboard
- Check browser console for errors
- Verify AuthCallback.tsx is handling session correctly
- Test with browser dev tools network tab to see OAuth flow

## Next Steps

1. ✅ Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel
2. ✅ Enable OAuth providers in Supabase dashboard
3. ✅ Configure OAuth apps in Google/GitHub/LinkedIn/Azure consoles
4. ✅ Update redirect URLs to use Supabase callback URL
5. ✅ Test login flow on production

---

**Your Supabase Project:** Find your project ref in Supabase dashboard URL  
**Format:** `https://app.supabase.com/project/[YOUR-PROJECT-REF]`  
**Callback URL:** `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
