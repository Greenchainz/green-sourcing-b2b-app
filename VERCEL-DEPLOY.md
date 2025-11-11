# Deploy Frontend to Vercel - Complete Guide

## Prerequisites
- GitHub repository pushed: ✅ Done (`jnorvi5/green-sourcing-b2b-app`)
- Supabase project created with credentials
- Frontend builds successfully: ✅ Verified (npm run build succeeded)

---

## Quick Deploy (5 minutes)

### Step 1: Import Repository to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Sign in with GitHub (recommended for automatic deploys)

2. **Import Git Repository**
   - Click **Import Git Repository**
   - Search for: `green-sourcing-b2b-app`
   - Click **Import** next to your repository

3. **Configure Project**
   - **Project Name**: `greenchainz-app` (or your choice)
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` ⚠️ **IMPORTANT** - click "Edit" and set to `frontend/`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

### Step 2: Configure Environment Variables

**CRITICAL**: Add these environment variables before deploying:

| Key | Value | Where to Find |
|-----|-------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Supabase Dashboard → Project Settings → API |

**How to Add**:
1. In Vercel import screen, scroll to **Environment Variables**
2. Click **Add** for each variable
3. Name: `VITE_SUPABASE_URL`
4. Value: Paste from Supabase (starts with `https://`)
5. Select: **Production**, **Preview**, **Development** (all three)
6. Repeat for `VITE_SUPABASE_ANON_KEY`

### Step 3: Deploy

1. Click **Deploy**
2. Wait ~2-3 minutes for build and deployment
3. You'll get a URL: `https://greenchainz-app.vercel.app`

---

## Verification Steps

### 1. Check Build Success
Vercel will show:
```
✓ Building
✓ 94 modules transformed
✓ Built in [time]
✓ Deployment Ready
```

### 2. Test the Live App

**Visit your Vercel URL** and verify:

#### Home/Landing (if configured):
- [ ] Page loads without errors
- [ ] Navigation works

#### Products Page (`/products`):
- [ ] Navigate to: `https://your-app.vercel.app/products`
- [ ] Sample products display (should show 3 products from Supabase)
- [ ] Product cards show:
  - Product name
  - Supplier name
  - Price
  - Carbon footprint badge
  - Recycled content percentage
- [ ] Check browser console (F12) for errors

### 3. Verify Supabase Connection

**Browser Console Test**:
```javascript
// Open DevTools (F12) → Console tab
// Paste and run:
console.log(import.meta.env.VITE_SUPABASE_URL)
// Should output your Supabase URL (not undefined)
```

**Backend Query Test**:
- Products should load from Supabase
- If empty or error, check:
  1. Supabase credentials are correct
  2. RLS policies allow public SELECT on products table
  3. Sample data exists (run `frontend/supabase-setup.sql`)

---

## Troubleshooting

### Build Fails with "Module not found"

**Error**: `Cannot find module '@/lib/supabase'`

**Solution**:
- This shouldn't happen (we fixed path aliases)
- If it does, check `frontend/tsconfig.app.json` has:
  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]
      }
    }
  }
  ```
- Redeploy after confirming config

### Environment Variables Not Working

**Symptoms**: 
- `import.meta.env.VITE_SUPABASE_URL` is `undefined`
- Products don't load, console shows connection error

**Solutions**:
1. **Check Variable Names**: Must start with `VITE_` (not `REACT_APP_`)
2. **Redeploy Required**: Vercel needs redeploy after adding env vars
   - Go to: **Deployments** → Click **...** on latest → **Redeploy**
3. **Check Variable Scope**: Ensure "Production" is checked
4. **View Variables**: **Settings** → **Environment Variables** to verify

### Products Page Shows Empty or Error

**Symptoms**: Page loads but no products display

**Checklist**:
1. ✅ **Supabase Setup**: 
   - Did you run `frontend/supabase-setup.sql` in Supabase SQL Editor?
   - Check table exists: `SELECT * FROM products;`
   
2. ✅ **RLS Policies**: 
   - Public SELECT must be enabled
   - Run in Supabase SQL Editor:
     ```sql
     SELECT * FROM pg_policies WHERE tablename = 'products';
     ```
   - Should show a policy allowing `anon` role to SELECT

3. ✅ **Client Code**:
   - Check `frontend/lib/supabase.ts` uses correct env vars:
     ```typescript
     import.meta.env.VITE_SUPABASE_URL
     import.meta.env.VITE_SUPABASE_ANON_KEY
     ```

### TypeScript Errors in Build

**Error**: "Type 'X' is not assignable to type 'Y'"

**Solution**:
- We already fixed the main issues (optional chaining in ProductsPage)
- If new errors appear, check `frontend/src/pages/ProductsPage.tsx`
- Ensure all JSONB field accesses use optional chaining:
  ```typescript
  product.sustainability_data?.carbon_footprint
  product.sustainability_data?.certifications?.map(...)
  ```

---

## Custom Domain Setup (Optional)

### Add Your Domain:

1. **In Vercel Dashboard**:
   - Go to: **Project Settings** → **Domains**
   - Click **Add Domain**
   - Enter: `app.greenchainz.com` (or your subdomain)

2. **Configure DNS**:
   Vercel will show instructions. Typically:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

3. **Wait for Verification**:
   - DNS propagation: 5 minutes to 48 hours
   - Vercel auto-provisions SSL certificate
   - Green checkmark when ready

---

## Automatic Deployments

### How It Works:
- **Production**: Every push to `main` branch auto-deploys
- **Preview**: Pull requests get unique preview URLs
- **Rollback**: Instant rollback to any previous deployment

### Disable Auto-Deploy (if needed):
- **Settings** → **Git** → Uncheck "Production Branch"

---

## Environment-Specific Configs

### Development (Local)
File: `frontend/.env.local` (already exists)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Preview (Vercel PRs)
- Uses same env vars as Production
- Can override in: **Settings** → **Environment Variables** → Filter by "Preview"

### Production (Vercel)
- Configured during import (Step 2 above)
- Update anytime: **Settings** → **Environment Variables**

---

## Performance Optimization

### Already Configured:
- ✅ Vite production build (optimized bundle)
- ✅ Code splitting (React lazy loading ready)
- ✅ Vercel Edge Network (global CDN)
- ✅ HTTP/2 and compression enabled

### Recommended Enhancements:

**1. Enable Vercel Analytics** (Free):
```bash
npm install @vercel/analytics
```

Add to `frontend/src/main.tsx`:
```typescript
import { inject } from '@vercel/analytics';
inject();
```

**2. Add React Lazy Loading**:
```typescript
// Instead of:
import ProductsPage from './pages/ProductsPage';

// Use:
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
```

**3. Image Optimization**:
- Upload images to Vercel
- Use `<Image>` from `next/image` (if migrating to Next.js)
- Or use Supabase Storage for product images

---

## Monitoring and Logs

### View Build Logs:
1. **Deployments** tab
2. Click on a deployment
3. **Build Logs** shows full npm output

### View Function Logs:
- **Functions** tab (for serverless API routes, if added)
- Real-time logs during development

### View Analytics:
- **Analytics** tab (after installing `@vercel/analytics`)
- Page views, unique visitors, top pages

---

## Cost Estimation

### Vercel Free Tier (Hobby):
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ⚠️ 1 concurrent build

**Estimated Monthly Cost**: $0 (for MVP stage)

**Upgrade to Pro** ($20/mo) when:
- Need team collaboration
- Want priority support
- Exceed 100 GB bandwidth
- Need concurrent builds

### Supabase Free Tier:
- ✅ 500 MB database
- ✅ 1 GB file storage
- ✅ 50,000 monthly active users
- ✅ 2 GB bandwidth

**Estimated Monthly Cost**: $0 (for MVP stage)

---

## Post-Deployment Checklist

- [ ] Frontend deploys successfully on Vercel
- [ ] Custom domain configured (optional)
- [ ] Environment variables verified (VITE_SUPABASE_*)
- [ ] Products page loads sample data
- [ ] Browser console shows no errors
- [ ] Supabase connection working
- [ ] Analytics installed (optional)
- [ ] Test on mobile devices
- [ ] Share URL with beta testers

---

## Next Steps After Deploy

### 1. Connect Backend API (When Ready)
Currently frontend uses Supabase directly. When backend is deployed:
- Add `VITE_API_URL` environment variable
- Update `frontend/src/lib/api.ts` to use backend endpoints
- Keep Supabase for authentication

### 2. Enable Authentication
- Configure Supabase Auth providers (email, Google, etc.)
- Update `AuthContext.tsx` with sign-in/sign-up logic
- Add protected routes with `ProtectedRoute.tsx`

### 3. Add More Features
- Supplier dashboard (`SupplierDashboard.tsx`)
- Architect dashboard (`ArchitectDashboard.tsx`)
- Admin console (`AdminConsole.tsx`)
- RFQ/quote flows

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vite Guide**: https://vitejs.dev/guide/
- **Supabase Docs**: https://supabase.com/docs
- **Repository Issues**: https://github.com/jnorvi5/green-sourcing-b2b-app/issues

---

## Quick Commands Reference

```bash
# Local development
cd frontend
npm install
npm run dev
# Open: http://localhost:5173

# Build locally (test before deploy)
npm run build
npm run preview
# Open: http://localhost:4173

# Type checking
npm run tsc

# Lint
npm run lint

# Redeploy from CLI (install vercel CLI first)
npm i -g vercel
vercel --prod
```

---

**Your app is now live!** 🎉

- **Landing Page**: `https://greenchainz-landing.pages.dev` (Cloudflare)
- **App**: `https://greenchainz-app.vercel.app` (Vercel)
- **Backend** (when deployed): TBD

**Share these URLs** with Microsoft for Startups validation, beta testers, and potential data providers.
