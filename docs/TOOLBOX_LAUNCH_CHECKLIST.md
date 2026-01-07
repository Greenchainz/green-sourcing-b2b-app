# GreenChainz Toolbox Launch: Pre-Flight Checklist

## 🟢 Execution Phase (This Week)

### Code Deployment
- [ ] `npm install` (install mssql, @types/office-js, lucide-react)
- [ ] Verify all new files compile without errors
- [ ] Test homepage locally: `npm run dev` → `http://localhost:3000`
- [ ] Check all tool landing pages load:
  - [ ] `/excel-addin` (landing page)
  - [ ] `/chrome-extension` (landing page)
  - [ ] `/revit-plugin` (landing page)

### Azure SQL Setup
- [ ] Create `Products` table (schema in QUICK_START.md)
- [ ] Seed with 50-100 common building materials
- [ ] Verify connection string in `.env.local`:
  ```
  AZURE_SQL_SERVER=...
  AZURE_SQL_DATABASE=...
  AZURE_SQL_USER=...
  AZURE_SQL_PASSWORD=...
  ```
- [ ] Test API locally:
  ```bash
  curl -X POST http://localhost:3000/api/audit/excel-batch \
    -H "Content-Type: application/json" \
    -d '{"materials": ["Drywall 5/8"]}'
  ```

### Office Add-in (Manifest & Testing)
- [ ] Generate GUID for add-in ID: https://www.uuidgenerator.net/
- [ ] Update `public/manifest.xml` with GUID
- [ ] Update manifest `<SourceLocation>` to point to dev server: `http://localhost:3000/excel-addin`
- [ ] Test in Excel Online:
  - [ ] Upload manifest to Excel Online
  - [ ] Verify sidebar loads correctly
  - [ ] Test "Run Audit" with sample materials
  - [ ] Verify 3 columns append with data

### Vercel Deployment
- [ ] Push code to GitHub: `git push origin main`
- [ ] Verify Vercel auto-deploys
- [ ] Set environment variables in Vercel dashboard:
  - [ ] `AZURE_SQL_SERVER`
  - [ ] `AZURE_SQL_DATABASE`
  - [ ] `AZURE_SQL_USER`
  - [ ] `AZURE_SQL_PASSWORD`
  - [ ] `NEXT_PUBLIC_API_URL=https://greenchainz.com`
- [ ] Test production homepage: https://greenchainz.com
- [ ] Verify all tool links work

---

## 🟡 Pre-Launch Phase (Week 2)

### Data Preparation
- [ ] Seed Azure SQL with 500+ common building materials
- [ ] Verify scraper can be triggered via API
- [ ] Test fallback: audit material NOT in database → scraper finds EPD data
- [ ] Optimize database indexes on `Products.name`

### Excel Add-in Production Readiness
- [ ] Update manifest `<SourceLocation>` to production: `https://greenchainz.com/excel-addin`
- [ ] Update manifest `<AppDomain>` to production domain
- [ ] Test with Excel Desktop (Windows + Mac) if possible
- [ ] Prepare for Microsoft AppSource submission

### Marketing & Demo
- [ ] Record 2-minute demo video:
  - [ ] Show homepage
  - [ ] Show Excel audit workflow (select materials → click audit → results)
  - [ ] Show health grade interpretation
  - [ ] Show alternative materials suggestion
- [ ] Write blog post: "Introducing the GreenChainz Toolbox"
- [ ] Prepare pitch deck for Microsoft partnership meeting

### Azure AD Integration (Optional, High-Impact for Enterprise)
- [ ] Add Azure AD auth to `/api/audit/excel-batch`
- [ ] Update Excel add-in to send Bearer token
- [ ] Test enterprise SSO flow

---

## 🟢 Launch Phase (Week 3)

### Office AppSource Submission
- [ ] Create Partner Center account (if not already done)
- [ ] Prepare submission package:
  - [ ] Updated manifest.xml
  - [ ] Marketing images (1200x720, 1000x600, 190x190)
  - [ ] Description, category, support contact info
- [ ] Submit to AppSource for review (3-5 day turnaround)
- [ ] Monitor approval status

### Chrome Extension (Optional, Can Be Phase 2)
- [ ] Decide: Launch simultaneously or stagger?
- [ ] If launching:
  - [ ] Build Chrome extension code
  - [ ] Test on Sweets.com, Material Bank
  - [ ] Submit to Chrome Web Store
  - [ ] Create landing page at `/chrome-extension`

### Revit Plugin (Optional, Can Be Phase 2)
- [ ] Decide: Launch simultaneously or stagger?
- [ ] If launching:
  - [ ] Compile .NET add-in for Revit
  - [ ] Create installation instructions
  - [ ] Create landing page at `/revit-plugin`

### Press & Partnerships
- [ ] Announce on Twitter, LinkedIn
- [ ] Reach out to architectural publications
- [ ] Contact Microsoft partnership team with demo
- [ ] Pitch to LEED certification training programs

---

## 📊 Launch Success Metrics

Set baseline before launch, then track:

- [ ] **Week 1:**
  - [ ] 50+ homepage visitors
  - [ ] 10+ Excel add-in installations
  - [ ] 5+ free signups

- [ ] **Month 1:**
  - [ ] 1K+ homepage visitors
  - [ ] 100+ Excel add-in active users
  - [ ] 50+ free signups
  - [ ] Average audit: 15 materials per user

- [ ] **Month 3:**
  - [ ] 10K+ monthly active users
  - [ ] 50+ premium conversions
  - [ ] 100K+ materials audited

---

## 🚨 Critical Dependencies

### Must-Have Before Launch
- ✅ Azure SQL with sample data
- ✅ Working Excel add-in (tested in Excel Online)
- ✅ Production manifest (correct domain)
- ✅ Vercel deployment working
- ✅ Home page live at greenchainz.com

### Nice-to-Have Before Launch
- ✅ Azure AD auth (can add Week 2)
- ✅ 500+ materials seeded (can do Week 2)
- ✅ Blog post / demo video (can do Week 2)
- ⚠️ AppSource approval (takes 3-5 days, plan accordingly)

---

## 🎬 Decision Points

### Question 1: AppSource Submission Timeline
**Option A:** Submit immediately after launch (Week 3)
- ✅ Faster to reach 365M Excel users
- ❌ 3-5 day review window = delayed launch
- ✅ **RECOMMENDED:** Do this

**Option B:** Wait until optimized (Week 5)
- ✅ More time to optimize UX
- ❌ Slower time to market
- ❌ Competitors catch up

→ **Decision:** Submit to AppSource in Week 3

---

### Question 2: Chrome Extension & Revit Plugin
**Option A:** Launch all 3 together (Week 3)
- ✅ Complete suite messaging ("Swiss Army Knife")
- ❌ 3x complexity + bugs + deployment risk
- ❌ Team stretched thin

**Option B:** Stagger: Excel (Week 3) → Chrome (Week 6) → Revit (Week 10)
- ✅ Excel gets focus, quality, polish
- ✅ Learn from Excel launch, apply to others
- ✅ Manage team capacity
- ✅ **RECOMMENDED:** Do this

→ **Decision:** Launch Excel now, Chrome in 3 weeks, Revit in 6 weeks

---

## 📋 Files to Complete

### Created This Session
- ✅ `app/page.tsx` - Toolbox homepage
- ✅ `app/excel-addin/page.tsx` - Excel UI
- ✅ `app/excel-addin/layout.tsx` - Office.js loader
- ✅ `app/excel-addin/page-landing.tsx` - Excel landing page
- ✅ `app/chrome-extension/page.tsx` - Extension landing page
- ✅ `app/revit-plugin/page.tsx` - Revit landing page
- ✅ `app/api/audit/excel-batch/route.ts` - Audit API (Azure SQL)
- ✅ `public/manifest.xml` - Office add-in registration
- ✅ `lib/excel/utils.ts` - Office.js utilities
- ✅ `lib/prompts/data-janitor.ts` - AI extraction prompts
- ✅ `package.json` - Updated dependencies

### Documentation
- ✅ `docs/EXCEL_ADDIN_SETUP.md`
- ✅ `docs/EXCEL_SCRAPER_INTEGRATION.md`
- ✅ `docs/TOOLBOX_LAUNCH_SUMMARY.md`
- ✅ `docs/QUICK_START.md`
- ✅ `docs/TOOLBOX_LAUNCH_CHECKLIST.md` (this file)

---

## 🎯 Success = Meeting ONE of These Goals

- ✅ **Microsoft Partnership:** Demo to Microsoft team, get commitment
- ✅ **User Growth:** 100+ Excel add-in users by Month 1
- ✅ **Revenue:** 10+ premium conversions by Month 2
- ✅ **Press:** Feature in architecture/design publication

Pick one. Own it. Execute relentlessly.

---

**Status:** 🟢 READY FOR EXECUTION
**Start Date:** Now
**Target Launch:** 2 weeks
**Owner:** You

**Let's go.** 🚀

