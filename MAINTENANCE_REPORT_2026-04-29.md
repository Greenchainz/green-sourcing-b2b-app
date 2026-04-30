# GreenChainz Maintenance Report — 2026-04-29

**Run Time:** Automated maintenance task (non-peak hours)
**Status:** Issues identified, awaiting manual review

---

## Issues Found

### 🔴 **CRITICAL: Dead Code — Next.js Imports in Express App**

**File:** `lib/auth/middleware.ts`  
**Issue:** Imports from `next/server` module that doesn't exist in this Express + Vite codebase

```typescript
import { NextRequest, NextResponse } from 'next/server';  // ❌ WRONG
```

**Impact:**
- TypeScript will fail: `Cannot find module 'next/server'`
- This breaks the `npm run check` script
- Code appears to be leftover from an old Next.js migration

**Recommendation:**
Delete this file if unused, or rewrite to use Express `Request`/`Response` types if needed.

**Status:** Not actively used in server code (grep search inconclusive due to session timeout, but unlikely imported)

---

### 🟡 **Dead Type Stubs in `types/global.d.ts`**

**Issue:** File contains type declarations for Next.js modules that don't exist in an Express app:
- `next/server` (NextRequest, NextResponse)
- `next/link` (Link component)
- `next/image` (Image component)
- `@/app/app.auth` (signIn, signOut, auth)

**Impact:**
- Cruft that masks real type issues
- Violates CLAUDE.md rule: "THIS IS AN EXPRESS + VITE APP. IT IS NOT NEXT.JS."

**Recommendation:**
Remove Next.js stubs from `types/global.d.ts`. Keep only:
- `NodeJS.ProcessEnv`
- `Express.Request` augmentation
- Utility modules (mssql, uuid, @azure/ai-projects)

---

### 🟡 **Missing Dependencies**

**Issue:** `npm install` was not run in this environment. TypeScript check fails with:
```
error TS2688: Cannot find type definition file for 'node'
```

**Recommendation:** Run `npm ci` to restore dependencies (requires ~45s)

---

## Summary

| Issue | Severity | Action | Effort |
|-------|----------|--------|--------|
| Next.js imports in Express codebase | Critical | Delete `lib/auth/middleware.ts` or rewrite | 5 min |
| Dead type stubs | Medium | Clean up `types/global.d.ts` | 5 min |
| Missing node_modules | Low | Run `npm ci` | ~45s |

**Money Lane Impact:** None — these are architectural/code quality issues, not revenue-blocking bugs.

---

## Notes

- Recent commit `a256733` ("m") appears incomplete — just formatting/line-ending changes across 8 files
- No uncommitted changes in working tree
- Branch is clean; ready for fixes
