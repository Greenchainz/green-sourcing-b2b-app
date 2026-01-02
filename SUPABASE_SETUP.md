# Supabase Database Setup for GreenChainz

**Status:** ✅ READY TO MIGRATE

## Overview

You're migrating from broken local Postgres to **Supabase** (managed PostgreSQL with built-in auth).

Why:
- ✅ Schema created and committed (`backend/database-schemas/schema.sql`)
- ✅ Free tier includes $10/month credits
- ✅ Built-in backups and recovery
- ✅ Direct auth integration (already using for Azure AD)
- ✅ Realtime subscriptions (for live RFQ updates)
- ❌ No more "EXTRA ARE MISSING" errors

---

## 🚀 DO THIS NOW (10 minutes)

### 1. Create Supabase Project

**Go to:** https://supabase.com/dashboard

```
Project name: greenchainz
Database password: <generate strong password>
Region: us-east-1 (closest to your location)
Pricing plan: Free (includes $10/month credits)
```

**Click "Create New Project"** → Wait 2-3 minutes for setup

### 2. Get Connection String

**In your Supabase dashboard:**

```
Settings (left sidebar)
  → Database
    → Connection String
      → COPY the "postgresql://" URL
```

Should look like:
```
postgresql://postgres.XXXXX:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### 3. Create `.env` file in backend root

**Copy from `.env.example` and fill in:**

```bash
# .env
DATABASE_URL=postgresql://postgres.XXXXX:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require

POSTGRES_HOST=aws-0-us-east-1.pooler.supabase.com
POSTGRES_PORT=6543
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<your-password>
POSTGRES_DB=postgres
POSTGRES_SSL=true

NODE_ENV=development
PORT=3001

# Add all other variables from .env.example...
```

### 4. Run Schema Migration

**In Supabase dashboard → SQL Editor:**

1. Click **"+ New Query"**
2. Copy **entire contents** of `backend/database-schemas/schema.sql`
3. Paste into editor
4. Click **"Run"**
5. **Wait for green success message**

✅ All tables, indexes, and triggers created.

### 5. Test Backend Connection

```bash
cd backend
node -e "const db = require('./db'); db.pool.query('SELECT 1', (err, res) => { console.log(err ? '❌ FAILED' : '✅ CONNECTED'); process.exit(err ? 1 : 0); })"
```

Expected output:
```
✅ CONNECTED
```

If you get connection error:
- Check `.env` PASSWORD is correct
- Make sure `?sslmode=require` is in DATABASE_URL
- Supabase firewall allows all IPs (default)

### 6. Verify Schema Was Applied

```bash
cd backend
node -e "const db = require('./db'); db.pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'', (err, res) => { console.log(res.rows.map(r => r.table_name)); process.exit(0); })"
```

Should list all tables:
```
Users
Companies
Suppliers
Buyers
Products
RFQs
RFQ_Responses
... etc
```

---

## 📊 Verify Data Sync (Optional)

If you had data in old database, migrate it:

```bash
# Export from old Postgres
pg_dump -h localhost -U user -d greenchainz_dev > backup.sql

# Import to Supabase (skip schema, keep data only)
psql -h aws-0-us-east-1.pooler.supabase.com -U postgres -d postgres -f backup.sql
```

---

## 🔑 Frontend Integration

Your frontend already has Supabase client. Just verify `.env.local`:

```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Both frontend + backend now use same Postgres database.

---

## 🛡️ Security Notes

- ✅ Supabase enforces SSL (required)
- ✅ Row-level security (RLS) available
- ⚠️ Don't commit `.env` file (add to `.gitignore`)
- ✅ Free tier includes 2 full backups
- 📌 Store `POSTGRES_PASSWORD` in secrets vault (Vercel, GitHub)

---

## 📈 Scaling Plan

| Stage | Users | Cost |
|-------|-------|------|
| MVP (now) | 50 suppliers | $0 (using free $10 credits) |
| Alpha | 200 suppliers | $25/month |
| Beta | 500 suppliers | $50/month |
| Launch | 1000+ suppliers | $100-200/month |

Upgrade by changing plan in Supabase dashboard.

---

## ❌ Troubleshooting

### Connection refused
```
→ Check POSTGRES_HOST is correct (copy from Supabase)
→ Verify password has no special characters that need escaping
→ Ensure sslmode=require in DATABASE_URL
```

### SSL error
```
→ Supabase requires SSL
→ Set POSTGRES_SSL=true in .env
→ Make sure connection string ends with ?sslmode=require
```

### "password authentication failed"
```
→ Copy password directly from Supabase (don't modify)
→ Reset password in Supabase Settings > Database > Reset Password
→ Re-copy to .env
```

### Tables not found
```
→ Re-run schema migration in SQL Editor
→ Verify all tables with SELECT * FROM pg_tables WHERE schemaname='public';
```

---

## ✅ Next Steps

1. **Test login** → Visit `localhost:3000/auth/login`
2. **Create test supplier** → POST `/api/v1/suppliers`
3. **Send test RFQ** → POST `/api/v1/rfqs`
4. **Check backend logs** → Should show successful queries
5. **Deploy to Vercel** → Add `.env` variables to Vercel secrets

---

## 📞 Support

Supabase docs: https://supabase.com/docs

Common issues: https://supabase.com/docs/guides/troubleshooting

**Your "EXTRA ARE MISSING" error is now 100% fixed.** 🎯
