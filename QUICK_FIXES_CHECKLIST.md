# Quick Maintenance Fixes — Checklist
**Generated:** April 30, 2026  
**Risk Level:** LOW — Safe to apply without breaking changes

---

## ✅ Safe to Remove Immediately

These console statements are safe to delete. They're either:
- Debug code that never should ship
- Redundant with Sentry error tracking
- Not connected to business logic

### Client Console Statements (Low Risk)

```
client/src/lib/sentry.ts:26
- console.log("[Sentry] Client monitoring initialized");
```
→ **Action:** Delete. Sentry logs this internally.

```
client/src/pages/ComponentShowcase.tsx (line varies)
- console.log("Dialog submitted with value:", dialogInput);
```
→ **Action:** Delete. Showcase page is for UI testing only.

```
client/src/components/messaging/VideoCallButton.tsx:60
- console.log("ACS call initiated:", result);
```
→ **Action:** Convert to `console.error()` if needed for debugging, otherwise delete.

---

## ⚠️ Should Be Converted to Structured Logging

These are useful for production debugging but should use Sentry/structured logs instead of console:

```
client/src/hooks/useWebPubSub.ts
- console.warn("WebPubSub not configured");
- console.log("[WebPubSub] Connected");
- console.warn(...various connection issues);
```
→ **Action:** Replace `console.log/warn` with Sentry.captureMessage() or remove if not critical.

```
server/azure-maps-service.ts
- console.warn("Azure Maps subscription key not configured");
- console.warn(`No geocoding results for address: ${address}`);
- console.warn("No distance matrix results...");
- console.warn("No route found");
```
→ **Action:** Replace with structured logging or Sentry error tracking.

---

## 📝 Documentation Fixes (No Code Changes)

### 1. RevitPlugin.tsx — Update App Store URL
**File:** `client/src/pages/RevitPlugin.tsx:20`

**Current:**
```typescript
const DOWNLOAD_URL = "https://apps.autodesk.com/RVT/en/Detail/Index?id=greenchainz"; // TODO: replace with real App Store URL
```

**Action Required:**
- [ ] Confirm correct Autodesk App Store URL
- [ ] Update DOWNLOAD_URL constant
- [ ] Remove TODO comment
- [ ] Test link in staging

---

## 🧹 Cleanup Tasks (No Logic Changes)

### 1. SupplierDashboard Component Removal
**File:** `client/src/App.tsx:40`

**Current:**
```typescript
// TODO: verify no external links to /supplier-dashboard, then remove this import and SupplierDashboard.tsx
import SupplierDashboard from "./pages/SupplierDashboard";
```

**Action Required:**
- [ ] Search codebase for any links to `/supplier-dashboard`
- [ ] Check git history for when SupplierDashboard was deprecated
- [ ] Remove import statement
- [ ] Remove route definition
- [ ] Delete `client/src/pages/SupplierDashboard.tsx` file

---

## 🚫 DO NOT FIX (Requires Planning)

These are legitimate TODOs that require architectural decisions or feature planning:

- WebSocket subscription upgrades (messaging)
- Azure Communication Services integration
- Video call signaling (WebPubSub)
- AppSource upgrade flow
- Scraper run history tracking

**Action:** Create GitHub issues for each, tag as `type:enhancement`, `blocked-by:architecture-decision`, etc.

---

## Files Ready to Edit

Safe to edit immediately (no dependencies):
- `client/src/lib/sentry.ts` — remove 1 console.log
- `client/src/pages/ComponentShowcase.tsx` — remove 1 console.log
- `client/src/pages/RevitPlugin.tsx` — update 1 URL + remove comment

Requires search + cleanup:
- `client/src/App.tsx` — remove import + check no routes depend on SupplierDashboard
- `server/db.ts` — convert 1 console.warn

---

## Batch Operations (If Applying All at Once)

**Total console.log/warn removals:** ~30 instances  
**Estimated time:** 30–45 minutes with search-and-replace  
**Risk:** Very low (debug code only)  
**Testing needed:** Run `npm run dev`, spot-check pages open correctly  

---

## Approval

**Status:** Ready for review  
**Next steps:** Jerit approves scope → Claude applies fixes → Push to feature branch  

