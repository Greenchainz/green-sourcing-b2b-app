# Entra External ID — Google & Email/Password IDP Setup

This guide configures Azure Entra External ID so suppliers without a Microsoft account
can sign in via Google or email/password. In production, the Easy Auth sidecar handles
all `/.auth/*` routes — no code changes are required.

---

## Context

| Auth path | Who uses it | Status |
|---|---|---|
| Microsoft (AAD) | Buyers with M365 accounts | ✅ Working |
| Email/Password | Suppliers without SSO accounts | ✅ Working (new) |
| Google | Suppliers with Gmail/Google Workspace | Requires steps below |
| LinkedIn | Professionals | ✅ Working |

---

## Part 1 — Enable Entra External ID (if not already done)

1. Open [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID**.
2. In the left panel select **External Identities → External collaborators settings**.
3. Ensure **"Allow invitations to be sent to any domain"** is set, or allowlist
   `gmail.com` and your target supplier domains.

---

## Part 2 — Add Google as an Identity Provider

> Reference: [Azure docs — Add Google as an IdP](https://learn.microsoft.com/en-us/azure/active-directory/external-identities/google-federation)

### 2a. Create a Google OAuth client

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID** → Application type: **Web application**.
3. Add authorized redirect URI:
   ```
   https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc/oauth2/authresp
   ```
4. Save the **Client ID** and **Client Secret**.

### 2b. Register Google in Entra

1. Azure Portal → **Microsoft Entra ID → External Identities → All identity providers**.
2. Click **+ Google**.
3. Enter the **Client ID** and **Client Secret** from step 2a.
4. Click **Save**.

### 2c. Enable Google on your app registration

1. Azure Portal → **Microsoft Entra ID → App registrations** → select `GreenChainz`
   (client ID `479e2a01-70ab-4df9-baa4-560d317c3423`).
2. **Authentication → Add a platform** (if not already Web).
3. Redirect URI: `https://<your-container-app-domain>/.auth/callback` must already be present.
4. In **Supported account types**, ensure **"Accounts in any identity provider"** is selected
   (or "Accounts in any organizational directory and personal Microsoft accounts").

### 2d. Enable Google in Easy Auth on the Container App

1. Azure Portal → **Container Apps → greenchainz-app → Authentication**.
2. Click **Add provider → Google**.
3. Enter the same Google **Client ID** and **Client Secret**.
4. Set **Allowed token audiences** to your app's client ID if prompted.
5. Save. The sidecar now handles `/.auth/login/google` automatically.

---

## Part 3 — Email/Password (already deployed)

Email/password auth is live as of the `email-auth.ts` commit. Credentials are stored in
the `email_credentials` table (scrypt-hashed, never plaintext).

Routes:
- `POST /api/auth/email/signup` — create account + issue session cookie
- `POST /api/auth/email/login`  — verify password + issue session cookie

Role assignment:
- `@greenchainz.com` → `admin`
- `role=supplier` in request body → `supplier`
- All others → `buyer`

### Table DDL (auto-created on first signup)

```sql
CREATE TABLE IF NOT EXISTS email_credentials (
  id          SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL,
  email       VARCHAR(320) NOT NULL UNIQUE,
  salt        BYTEA NOT NULL,
  hash        BYTEA NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Part 4 — Local Dev Notes

| Flow | Local behaviour |
|---|---|
| `/.auth/login/aad` | Redirects to real Microsoft login (dev shim active) |
| `/.auth/login/google` | Redirects to `/login?error=google_dev_unsupported` — use email/password |
| `POST /api/auth/email/*` | Fully functional locally (requires `DATABASE_URL` in `.env.local`) |

To test Google login locally before configuring Entra, add a `GOOGLE_CLIENT_ID` env var
and update `registerDevAuthShim` in `server/_core/easy-auth.ts` to do a full Google OAuth
redirect (similar to the AAD shim).

---

## Verification Checklist

- [ ] Google OAuth client created in Google Cloud Console
- [ ] Redirect URI `https://login.microsoftonline.com/.../oauth2/authresp` added
- [ ] Google IdP added in Entra External Identities
- [ ] Easy Auth → Google provider enabled on Container App
- [ ] Test: sign in via `/.auth/login/google` on production URL
- [ ] Test: supplier creates account via email/password on `/login`
- [ ] Test: `email_credentials` row exists in Azure PostgreSQL after signup
