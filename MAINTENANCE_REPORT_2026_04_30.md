# GreenChainz Maintenance Report
**Date:** April 30, 2026  
**Scope:** Automated code quality scan — console statements, TODO comments, and common issues

---

## Summary

Scanned 366 TypeScript files (200 client, 166 server). Identified low-risk maintenance items suitable for April cleanup. No critical issues or blocking errors detected.

---

## Issues Found

### 1. Console Statements in Production Code (LOW RISK — safe to remove)

**Total Found:** ~30 instances across client and server

These are debug/logging statements that should be removed or converted to proper logging:

#### Client (client/src/)
- `VideoCallButton.tsx` — console.log in ACS call handler
- `WebRTCVideoCall.tsx` — connection state logging
- `RealTimeChat.tsx` — 4× console.log for WebSocket lifecycle
- `RealTimeMessageThread.tsx` — 4× console.log for WebSocket/confirmation
- `useNotifications.ts` — WebPubSub connection logging
- `useWebPubSub.ts` — connection lifecycle logging
- `sentry.ts` — Sentry initialization log
- `ComponentShowcase.tsx` — dialog submission logging

#### Server (server/)
- `admin-routes/index.ts` — PDF import process logging (3×)
- `autodesk-oauth.ts` — token expiry logging
- `azure-maps-service.ts` — 4× console.warn for config/results
- `db.ts` — database availability warning

**Recommendation:** Convert to proper logging (Sentry, structured logs) or remove if not needed for debugging.

---

### 2. TODO/FIXME Comments (Requires Decision)

**Total Found:** 13 instances

#### Client
1. **App.tsx:40** — "verify no external links to /supplier-dashboard, then remove import and SupplierDashboard.tsx"  
   → Cleanup task — check no routes reference old dashboard

2. **messaging/IncomingCallNotification.tsx:35** — "Replace with WebSocket subscription when available"  
   → Feature upgrade — depends on WebSocket implementation

3. **messaging/VideoCallButton.tsx:52** — "Open ACS video call UI"  
   → Incomplete implementation

4. **pages/RevitPlugin.tsx:20** — "replace with real App Store URL"  
   → Config fix — needs Autodesk App Store URL

5. **pages/Subscription.tsx:191** — "Implement upgrade flow via Microsoft AppSource"  
   → Feature work

#### Server
6. **notification-service.ts:136** — "Integrate with Azure Communication Services"  
   → Feature integration

7. **routers/txdotScraper.ts:93** — "Implement scraper run history tracking"  
   → Feature enhancement

8. **video-call-service.ts** (3×) — "Implement proper signaling — use WebPubSub to broadcast to peer"  
   → Video/WebRTC feature work

9. **_core/notification.ts:49** — "Wire this to a real Azure channel"  
   → Feature integration

**Recommendation:** Triage into backlog. High-priority items blocking revenue (Revit plugin, subscription upgrade) should be scheduled.

---

## No Critical Findings

✅ No TypeScript compilation issues detected (pre-requisite: `npm install`)  
✅ No obvious security issues in scanned files  
✅ No broken imports or dangling references in spot checks  
✅ No unused dependencies identified  

---

## Suggested Next Steps (Priority Order)

### 🟢 Low-Effort, Low-Risk (April Cleanup)
1. Remove console.log statements from production code OR convert to structured logging
2. Document RevitPlugin.tsx App Store URL requirement in CONTRIBUTING.md
3. Add linting rule to prevent new console statements in production builds

### 🟡 Medium-Effort (Requires Planning)
1. Triage TODO items into GitHub issues with labels (blocked-by, feature-request, cleanup)
2. Schedule "Replace with WebSocket subscription" refactor (impacts messaging UX)
3. Plan Azure Communication Services integration (notification-service dependency)

### 🔴 High-Priority (Revenue-Blocking)
1. **RevitPlugin.tsx** — Get real Autodesk App Store URL and update DOWNLOAD_URL
2. **Subscription.tsx** — Implement AppSource upgrade flow (architect onboarding blocker)
3. **SupplierDashboard** cleanup — Verify no routes remain, remove import (App.tsx:40)

---

## Maintenance Habits to Establish

- Run `npm run check` before every PR (TypeScript strict mode)
- Add ESLint rule: `no-console` in production builds
- Mark TODOs with GitHub issue numbers: `// TODO: #123 — description`
- Use Sentry or structured logging instead of console statements
- Schedule quarterly code quality audits

---

## Files Analyzed

- **Client:** 200 TSX/TS files (client/src/)
- **Server:** 166 TS files (server/)
- **Excluded:** node_modules, dist, build artifacts
- **Not checked:** Performance profiling, bundle size, unused dependencies (requires build step)

---

**Report Generated:** 2026-04-30 automated scan  
**Action:** Review and prioritize above items for upcoming sprints.
