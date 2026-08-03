# Email/Password IDP Setup

This guide covers the email/password authentication for users without a Microsoft account.
Microsoft OAuth (PKCE) is the primary login path; email/password is the fallback.

---

## Context

| Auth path | Who uses it | Status |
|---|---|---|
| Microsoft (AAD) | Buyers with M365 accounts | ✅ Working |
| Email/Password | Suppliers without SSO accounts | ✅ Working |

---

## Part 1 — Email/Password (deployed)

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

## Part 2 — Local Dev Notes

| Flow | Local behaviour |
|---|---|
| `/api/auth/microsoft` | Redirects to real Microsoft login |
| `POST /api/auth/email/*` | Fully functional locally (requires `DATABASE_URL` in `.env`) |

---

## Verification Checklist

- [ ] Test: supplier creates account via email/password on `/login`
- [ ] Test: `email_credentials` row exists in Azure PostgreSQL after signup
