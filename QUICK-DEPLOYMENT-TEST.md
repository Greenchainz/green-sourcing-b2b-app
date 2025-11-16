# 🎯 Quick Deployment Test (5-Minute Checklist)

**Date:** November 16, 2025  
**App:** GreenChainz B2B Platform  
**Test Environment:** Vercel Production

---

## ✅ STEP 1: Open Your Live Site

**Open in Incognito/Private Browser:**
- Chrome: `Ctrl+Shift+N`
- Firefox: `Ctrl+Shift+P`
- Edge: `Ctrl+Shift+N`

**URL:** https://[your-vercel-app-name].vercel.app

> 💡 **Why incognito?** Avoids cached old version

---

## ✅ STEP 2: Visual Verification

### Top Navigation Bar
Look for:
```
[GreenChainz Logo] GreenChainz    Features  Contact  Login  Sign Up
```

**Expected:**
- ✅ Logo appears (SVG icon)
- ✅ "GreenChainz" text next to logo
- ✅ All menu links visible

**If logo missing:**
- Should show blue/cyan gradient box (fallback)
- This is OK - means SVG path needs adjustment

---

### Hero Banner
Look for this exact text:
```
🔵 Now accepting Charter 175 members
```

**Expected:**
- ✅ Says "Charter 175" (NOT "Founding 50")
- ✅ Blue/cyan color scheme
- ✅ Animated pulse dot

**If still says "Founding 50":**
- ❌ Old version cached - clear Vercel cache

---

### Main Headline
```
Sourcing Sustainable Materials Made Simple
```

**Expected:**
- ✅ Large white text
- ✅ "Made Simple" in gradient (blue to cyan)

---

## ✅ STEP 3: Navigation Test

Click each link and verify NO 404 errors:

| Link | Expected Page | Status |
|------|---------------|--------|
| Features | Features page with product info | [ ] |
| Contact | Contact form | [ ] |
| Privacy | Privacy policy text | [ ] |
| Terms | Terms of service text | [ ] |
| Sign Up | Signup form with 3 roles | [ ] |
| Login | Login form with OAuth buttons | [ ] |

---

## ✅ STEP 4: Signup Flow Test

1. Click "Sign Up"
2. Verify 3 role buttons visible:
   ```
   📊 Buyer          [Radio Button]
   🏭 Supplier       [Radio Button]
   📊 Data Provider  [Radio Button]
   ```

3. Verify OAuth buttons:
   ```
   [Continue with Google]
   [Continue with GitHub]
   [Continue with LinkedIn]
   [Continue with Microsoft]
   ```

4. Verify email form fields:
   ```
   Email: [___________]
   Password: [___________]
   [Sign Up Button]
   ```

---

## ✅ STEP 5: Footer Links Test

Scroll to bottom, click each footer link:

| Link | Should Open | Status |
|------|-------------|--------|
| Features | /features page | [ ] |
| Contact | /contact page | [ ] |
| Privacy | /privacy page | [ ] |
| Terms | /terms page | [ ] |

**Expected:** All links use React Router (page loads instantly, no full refresh)

---

## 🚨 TROUBLESHOOTING

### Logo Not Showing
**Current setup:**
- Logo path: `/greenchainz-logo.svg`
- File location: `/frontend/public/greenchainz-logo.svg` ✅
- Fallback: Blue/cyan gradient box

**If neither logo nor fallback appears:**
1. Check browser console: `F12` → Console tab
2. Look for error: `Failed to load resource: /greenchainz-logo.svg`
3. Fix: Logo component already has fallback, so this should never happen

### Still Says "Founding 50"
**Possible causes:**
1. Vercel deployment hasn't finished (wait 2-3 minutes)
2. CDN cache not cleared (wait 5 minutes)
3. Browser cache (use incognito, or hard refresh: `Ctrl+Shift+R`)

**Fix:**
- Check Vercel dashboard: Latest deployment status = "Ready" ✅
- Check git log: Last commit = "Charter 175 branding" ✅

### 404 on Navigation Links
**Cause:** Missing `vercel.json` SPA rewrite rules

**Fix:** Already added in last deployment ✅
```json
{
  "rewrites": [{"source": "/(.*)", "destination": "/index.html"}]
}
```

### OAuth Buttons Don't Work
**Expected behavior:** Should redirect to OAuth provider (Google, GitHub, etc.)

**If nothing happens:**
- This is EXPECTED (Supabase OAuth not configured yet)
- Email signup should still work
- Fix later: Configure OAuth in Supabase dashboard

---

## 📸 SCREENSHOT PROOF

Take screenshots of:
1. ✅ Homepage with "Charter 175" banner
2. ✅ Navigation bar with logo
3. ✅ Signup page with 3 roles
4. ✅ Features page (working link)

**Save to:** `/docs/deployment-proof-nov-16-2025/`

---

## ✅ SUCCESS CRITERIA

**ALL GREEN = DEPLOYMENT SUCCESSFUL:**
- [x] Logo appears (or fallback gradient box)
- [x] Banner says "Charter 175"
- [x] All navigation links work (no 404s)
- [x] Signup shows 3 roles
- [x] Footer links use React Router

**IF ANY RED = NEEDS FIX:**
- [ ] Logo completely broken (no fallback) → Check Logo.tsx
- [ ] Still says "Founding 50" → Check LandingPage.tsx
- [ ] 404 on links → Check vercel.json
- [ ] Signup broken → Check Signup.tsx

---

## 🎯 AFTER VERIFICATION

**If ALL GREEN:**
1. ✅ Mark deployment as successful
2. ✅ Move to outreach phase (send data provider emails)
3. ✅ Update DEPLOYMENT-VERIFICATION.md

**If ANY RED:**
1. ❌ Screenshot the error
2. ❌ Check browser console for errors
3. ❌ Check Vercel deployment logs
4. ❌ Re-run build locally: `npm run build`

---

**Test Completed:** [ ] Yes [ ] No  
**All Links Working:** [ ] Yes [ ] No  
**Charter 175 Visible:** [ ] Yes [ ] No  
**Ready for Outreach:** [ ] Yes [ ] No

---

**Next Step:** Send first 10 data provider emails (use template in DEPLOYMENT-VERIFICATION.md)
