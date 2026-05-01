# GreenChainz Maintenance Report
**Generated:** 2026-04-30 (automated maintenance scan)

---

## Summary
Automated maintenance scan completed. Found **3 actionable items** (all low-risk):
- 1 dead code import to remove
- Multiple development console.log statements in production code
- Several unimplemented TODO comments (documented for review)

**Status:** All findings are small, non-breaking fixes ready for staging.

---

## Issues Found

### 1. ✅ REMOVABLE: Dead Import in `client/src/App.tsx`

**Location:** Line 40 (commented TODO)
```typescript
// TODO: verify no external links to /supplier-dashboard, then remove this import and SupplierDashboard.tsx
```

**Finding:** The `SupplierDashboard.tsx` component is **not used**. 
- Line 112 in App.tsx has a redirect: `/supplier-dashboard` → `/supplier/dashboard`
- The real component is `SupplierProfileDashboard` (line 122)
- The old file can be safely deleted

**Action:** Remove unused import. Files to delete:
- `client/src/pages/SupplierDashboard.tsx`

**Risk:** ✅ None — this is dead code with a redirect in place.

---

### 2. ⚠️ CLEANUP: Console.log Statements in Production Code

Multiple `console.log()` calls left in production files. These are harmless but should be removed or converted to conditional logging:

**Files affected:**
- `client/src/components/messaging/VideoCallButton.tsx` (1 instance)
- `client/src/components/messaging/WebRTCVideoCall.tsx` (1 instance)
- `client/src/components/RealTimeChat.tsx` (5 instances)
- `client/src/components/RealTimeMessageThread.tsx` (4 instances)
- `client/src/hooks/useNotifications.ts` (2 instances)
- `client/src/hooks/useWebPubSub.ts` (1 instance)
- `client/src/lib/sentry.ts` (1 instance)
- `client/src/pages/ComponentShowcase.tsx` (1 instance)
- `lib/agents/scraper/scraper-agent.ts` (1 instance)

**Total:** ~18 console.log calls to clean up

**Recommendation:** Wrap in conditional or use structured logger

**Risk:** ✅ Low — no functional impact, informational only.

---

### 3. 📋 DOCUMENTED: TODO/FIXME Comments (Not Actionable Now)

These are intentional placeholders for future work. **No action required** unless implementing:

| File | Task | Priority |
|------|------|----------|
| `client/src/pages/RevitPlugin.tsx` | Replace Autodesk App Store URL with real URL | Medium |
| `client/src/pages/Subscription.tsx` | Implement upgrade flow via Microsoft AppSource | Medium |
| `client/src/components/messaging/IncomingCallNotification.tsx` | Replace with WebSocket subscription (ACS) | Low |
| `client/src/components/messaging/VideoCallButton.tsx` | Open ACS video call UI | Low |
| `server/notification-service.ts` | Integrate Azure Communication Services | Low |
| `server/routers/txdotScraper.ts` | Implement scraper run history tracking | Low |
| `server/video-call-service.ts` (3x) | Implement WebPubSub signaling | Low |
| `server/_core/notification.ts` | Wire real Azure channel | Low |

---

## Actionable Maintenance Tasks

### Task 1: Remove Dead Import (Low Risk ✅)

Edit `client/src/App.tsx`:
1. Delete line 40 (the TODO comment)
2. Delete file `client/src/pages/SupplierDashboard.tsx`

**Why safe:** 
- No other code references it
- Redirect exists: `/supplier-dashboard` → `/supplier/dashboard`
- Real component is `SupplierProfileDashboard`

---

### Task 2: Console.log Cleanup (Low Risk ✅)

Optional. Replace debug logs with conditional logging:

**Option A - Simple:** Remove all console.log from non-debug files
**Option B - Better:** Wrap in `if (process.env.DEBUG === 'true')` guard
**Option C - Best:** Use structured logger from `@/lib/logger`

**Recommendation:** Option A (remove them) for cleaner prod code.

---

## What NOT to Do

❌ Don't implement the TODOs (requires feature work, not maintenance)
❌ Don't refactor auth or database code (too risky)
❌ Don't touch ACS integration (requires design review first)
❌ Don't break any existing routes

---

## Credits Used

- Bash file scanning: minimal (<1%)
- File reads: ~10 (all local, no API/network calls)
- **Total:** <5% of available credits

---

## Staging Plan

1. Remove `SupplierDashboard.tsx` import from `App.tsx`
2. Delete `client/src/pages/SupplierDashboard.tsx`
3. Optionally clean console.log statements
4. Stage in a branch for your review
5. You push when ready

**Changes are minimal and low-risk.** Ready to implement on your approval.
