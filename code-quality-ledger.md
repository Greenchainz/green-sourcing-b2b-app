# GreenChainz Code Quality Ledger

**Rule:** Issues are not re-reported the next day. After 7 days `open` status resurfaces them as STILL OPEN.
**Format:** `ID | File:Line | Category | Status | First Seen | Last Checked | Description + Fix`

---

## How to use this ledger

- `Status: open` → not yet fixed
- `Status: fixed` → resolved (note the commit/PR)
- `Status: won't-fix` → accepted risk, add a reason
- Weekly nag: grep for `status: open` where `first_seen` is ≥7 days old → resurface those to Jerit

---

## P0 — Fix Before Next Deploy (Security / Multi-Tenant Safety)

---

### 20260522-001

| Field | Value |
| ------- | ------- |
| **File** | `server/rfq-router.ts:137-141` |
| **Category** | Auth / Multi-tenant leak |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `getWithBids` uses `protectedProcedure` but has **no ownership check**. Any authenticated user — supplier, buyer, anyone — can call `rfqMarketplaceRouter.getWithBids({ rfqId: X })` for any `rfqId` and see all bids including competitor prices.

```typescript
// CURRENT — leaks all bids to anyone
getWithBids: protectedProcedure
  .input(z.object({ rfqId: z.number() }))
  .query(async ({ input }) => {              // ← ctx never used
    return getRfqWithBids(input.rfqId);
  }),
```

**Fix:** Scope to owner or involved supplier:

```typescript
getWithBids: protectedProcedure
  .input(z.object({ rfqId: z.number() }))
  .query(async ({ ctx, input }) => {
    const db = await getDb();
    const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, input.rfqId)).limit(1);
    if (!rfq) throw new TRPCError({ code: 'NOT_FOUND' });
    // Allow: RFQ owner OR a supplier who has a bid on it
    const isOwner = rfq.userId === ctx.user.id;
    const [supplierRecord] = await db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.userId, ctx.user.id)).limit(1);
    const isBidder = supplierRecord
      ? !!(await db.select().from(rfqBids).where(and(eq(rfqBids.rfqId, input.rfqId), eq(rfqBids.supplierId, supplierRecord.id))).limit(1)).length
      : false;
    if (!isOwner && !isBidder && ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return getRfqWithBids(input.rfqId);
  }),
```

---

### 20260522-002

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:288-331` |
| **Category** | Auth / Multi-tenant leak |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `getRfqDetails` has no ownership check. Any authenticated user can read any RFQ's items AND all bid prices by ID. Exposes competitor pricing.

```typescript
// CURRENT
getRfqDetails: protectedProcedure
  .input(z.object({ rfqId: z.number() }))
  .query(async ({ ctx, input }) => {          // ← ctx.user never checked
    ...
    const rfq = await db.select().from(rfqs).where(eq(rfqs.id, input.rfqId))...
    // returns rfq + items + bids (including bidPrice)
  }),
```

**Fix:** Same pattern as 20260522-001 — verify `rfq.userId === ctx.user.id` OR user is an involved supplier before returning.

---

### 20260522-003

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:167-178` |
| **Category** | Auth / Identity spoofing |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `sendMessage` takes `senderId` from the **input**, not `ctx.user.id`. Any authenticated user can post a message in any thread attributed to any user ID they choose.

```typescript
// CURRENT
sendMessage: protectedProcedure
  .input(z.object({
    threadId: z.number(),
    message: z.string(),
    senderId: z.number(),           // ← client-supplied, not verified
    senderType: z.enum(["buyer", "supplier"]),
  }))
  .mutation(async ({ input }) => {
    return sendMessage(input.threadId, input.senderId, ...);
  }),
```

**Fix:**

```typescript
sendMessage: protectedProcedure
  .input(z.object({
    threadId: z.number(),
    message: z.string().min(1).max(4000),
    senderType: z.enum(["buyer", "supplier"]),
  }))
  .mutation(async ({ ctx, input }) => {
    // Verify user is a participant in this thread before sending
    return sendMessage(input.threadId, ctx.user.id, input.senderType, input.message);
  }),
```

---

### 20260522-004

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:218-222` |
| **Category** | Auth / Missing ownership check |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `acceptBid` — no ownership check. Any authenticated user can accept any bid on any RFQ. A supplier could accept their own bid, or a competitor could close someone else's deal.

```typescript
// CURRENT
acceptBid: protectedProcedure
  .input(z.object({ rfqId: z.number(), bidId: z.number() }))
  .mutation(async ({ input }) => {            // ← ctx never used
    return acceptBid(input.rfqId, input.bidId);
  }),
```

**Fix:** Verify `ctx.user.id` matches the `rfqs.userId` for `input.rfqId` before accepting.

---

### 20260522-005

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:143-157` |
| **Category** | Auth / Missing role check + identity spoofing |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `submitBid` takes `supplierId` from the request input — a buyer could bid as any supplier. Also no role check: architects/buyers can call this endpoint and pretend to be suppliers.

```typescript
.input(z.object({
  rfqId: z.number(),
  supplierId: z.number(),           // ← client-supplied — NOT verified against ctx.user
  bidPrice: z.number().positive(),
  ...
}))
.mutation(async ({ ctx, input }) => {
  return submitBid(input.rfqId, input.supplierId, ...);
  // ctx.user.id never compared to the supplier record
}),
```

**Fix:** Derive `supplierId` from the DB using `ctx.user.id`, not from the input:

```typescript
.mutation(async ({ ctx, input }) => {
  const db = await getDb();
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.userId, ctx.user.id)).limit(1);
  if (!supplier) throw new TRPCError({ code: 'FORBIDDEN', message: 'Supplier account required to bid' });
  return submitBid(input.rfqId, supplier.id, input.bidPrice, input.leadDays, input.notes);
}),
```

Remove `supplierId` from the Zod input schema entirely.

---

### 20260522-006

| Field | Value |
|-------|-------|
| **File** | `server/_core/oauth-providers.ts:342-362` |
| **Category** | Auth / Role regression bug |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** On every login, `upsertUser` is called with `role: assignedRole`. The assigned role defaults to `"buyer"` if no `?role=supplier` query param is present in the original OAuth initiation. **An existing supplier who signs in from the homepage (no role param) will have their role silently overwritten to `buyer`**, locking them out of their supplier dashboard.

```typescript
// oauth-providers.ts:342
let assignedRole: "buyer" | "supplier" | "admin" | "user" = "buyer";
if (userInfo.email?.endsWith("@greenchainz.com")) {
  assignedRole = "admin";
} else if (role === "supplier") {
  assignedRole = "supplier";
}
// ↑ existing supplier logs in from landing page → role = "buyer"

await db.upsertUser({
  ...
  role: assignedRole,               // ← overwrites their existing role every time
});
```

**Fix:** Only set role for NEW users. For existing users, preserve their current role:

```typescript
// Already have: const isNewUser = !existingUser;

await db.upsertUser({
  openId: userInfo.openId,
  name: userInfo.name,
  email: userInfo.email,
  loginMethod: userInfo.provider,
  lastSignedIn: new Date(),
  // Only assign role for new users — never downgrade an existing user
  role: isNewUser ? assignedRole : undefined,
});
```

Requires `upsertUser` to skip the `role` column when value is `undefined`.

---

## P1 — Fix This Sprint (Performance / Code Health)

---

### 20260522-007

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:225-253` and `256-285` |
| **Category** | Performance / N+1 queries |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** Both `getUserRfqs` and `getBuyerRfqs` loop over each RFQ and fire **2 separate DB queries per RFQ** (items + bids). 50 RFQs = 100 queries. These two procedures are also **near-identical duplicates** — only the procedure name differs.

```typescript
const enriched = await Promise.all(
  userRfqs.map(async (rfq) => {
    const items = await db.select().from(rfqItems).where(eq(rfqItems.rfqId, rfq.id));  // N queries
    const bids  = await db.select().from(rfqBids).where(eq(rfqBids.rfqId, rfq.id));   // N queries
    ...
  })
);
```

**Fix:** One aggregated query using `count()` with a GROUP BY join, or a single `WHERE rfqId IN (...)` batch query. Also delete `getBuyerRfqs` — it's dead code duplicating `getUserRfqs`.

---

### 20260522-008

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:180-185` |
| **Category** | Dead code |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `getMessages` is marked `(legacy — use getThreadMessages for paginated access)` in its own comment but is still a live endpoint. Dead surface area that still gets rate-limited, logged, and could be confused with the real endpoint.

**Fix:** Delete `getMessages` from the router. Confirm no client code calls `rfqMarketplaceRouter.getMessages` (grep for it), then remove.

---

### 20260522-009

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:36-62` (`supplierRfqRouter.getAvailableRfqs`) |
| **Category** | Auth / Missing role check |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `getAvailableRfqs` in `supplier-rfq-router.ts` is `protectedProcedure` but no supplier role check. Any authenticated user (buyers, architects) can pull all submitted RFQ project names and locations. Leaks buyer procurement intelligence to anyone with an account.

**Fix:** Add a supplier ownership check:

```typescript
getAvailableRfqs: protectedProcedure
  .query(async ({ ctx, input }) => {
    const db = await getDb();
    const [supplier] = await db.select({ id: suppliers.id }).from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id)).limit(1);
    if (!supplier) throw new TRPCError({ code: 'FORBIDDEN', message: 'Supplier account required' });
    // ... rest of query
  }),
```

---

### 20260522-010

| Field | Value |
|-------|-------|
| **File** | `server/_core/oauth-providers.ts:33-51` |
| **Category** | Infrastructure / Multi-replica risk |
| **Status** | fixed — 2026-06-02 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-06-02 |

**Problem:** OAuth CSRF state (`pendingStates`) was stored in an in-memory `Map`, which breaks callback validation in multi-replica deployments.

**Fix:** Replaced in-memory state with signed stateless OAuth state tokens (HMAC + TTL validation), so callback validation no longer depends on a single process instance.

---

### 20260522-011

| Field | Value |
|-------|-------|
| **File** | `server/supplier-router.ts:129` |
| **Category** | TypeScript / `any` |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** Drizzle query cast to `any` to satisfy the type checker:

```typescript
query = query.where(
  or(like(suppliers.companyName, searchTerm), ...)
) as any;  // ← silences a valid Drizzle chained-query type
```

**Fix:** Use a typed conditional instead of chaining `.where()` on the `select()` result:

```typescript
const results = await db
  .select()
  .from(suppliers)
  .where(
    input.query?.trim()
      ? or(
          like(suppliers.companyName, `%${input.query.trim()}%`),
          like(suppliers.city, `%${input.query.trim()}%`),
          like(suppliers.state, `%${input.query.trim()}%`)
        )
      : undefined
  )
  .limit(20);
```

---

## P2 — Fix When You Touch the File

---

### 20260522-012

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:84-100` |
| **Category** | Validation / Missing bounds |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** RFQ `submit` mutation has no upper bounds on string lengths or array sizes. Could receive a `projectName` of 100,000 chars or a `materials` array of 10,000 items, bloating DB and hammering the AI enrichment service.

**Fix:** Add `.max()` to all string fields and `.max()` to the array:

```typescript
projectName: z.string().min(1).max(200),
projectLocation: z.string().max(300),
notes: z.string().max(2000).optional(),
buyerPersona: z.string().max(100).optional(),
materials: z.array(...).min(1).max(50),
```

---

### 20260522-013

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:170` |
| **Category** | Validation / Missing bounds |
| **Status** | fixed — 2026-05-22 (fixed in P0-003 patch) |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `sendMessage` accepts `message: z.string()` with no `.min(1)` or `.max()`. A blank message or a 1MB string are both valid.

**Fix:** `message: z.string().min(1).max(4000)`

---

### 20260522-014

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts:339` (`analyzeWithAi`) |
| **Category** | Validation / Abuse vector |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** `analyzeWithAi` passes unbounded `z.array(z.string())` of material names to GPT-4 analysis via `enrichRfqWithAiAnalysis`. No limit on array size or string length. A bad actor can send 500 large strings to drive up Azure OpenAI token usage.

**Fix:**

```typescript
materials: z.array(z.string().max(100)).max(20),
projectLocation: z.string().max(300),
```

---

### 20260522-015

| Field | Value |
|-------|-------|
| **File** | `server/admin-routes/index.ts:82` |
| **Category** | TypeScript / `any` |
| **Status** | fixed — 2026-06-02 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-06-02 |

**Problem:** Express route handler was typed as `(req: any, res: any)` and used `(req as any).id` throughout error paths.

**Fix:** Replaced `any` handler types with `express.Request`/`express.Response` and centralized request ID access in a typed helper.

---

### 20260522-016

| Field | Value |
|-------|-------|
| **File** | `client/src/pages/SupplierOnboarding.tsx:119-128` |
| **Category** | UX / Schema inconsistency |
| **Status** | fixed — 2026-05-22 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-05-22 |

**Problem:** Step 5 (Service Area) labels the facility location field as required (`*`) in the UI copy and in the `CardDescription`, but the Zod schema marks `city`, `state`, `zipCode` all as `.optional()`. The review step shows an amber warning "⚠ Not set — RFQ routing will be limited" but still allows submission. This causes suppliers to appear in the system with no location, breaking distance-based RFQ routing.

**Fix — Option A (recommended):** Keep optional in schema but block the "Submit" button on the Review step if city/state/zip are all blank, with a clear in-page warning.

**Fix — Option B:** Mark them required in Zod and add them to `STEP_FIELDS[4]` so the "Next" button validates them.

---

### 20260522-017

| Field | Value |
|-------|-------|
| **File** | `client/src/pages/SupplierOnboarding.tsx` — missing field |
| **Category** | Product / Missing RFQ-critical field |
| **Status** | fixed — 2026-06-02 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-06-02 |

**Problem:** Onboarding captured certifications as checkboxes but did not capture an EPD document URL or operator.

**Fix:** Added `epdUrl` + `epdProgramOperator` to onboarding schema, persistence layer, supplier profile model, and Step 4 UI, plus DB migration `drizzle/migrations/20260602_add_supplier_epd_profile_fields.sql`.

---

### 20260522-018

| Field | Value |
|-------|-------|
| **File** | `server/_core/oauth-providers.ts:34` and `server/calling-service.ts:26`, `server/acs-video-service.ts:32`, `server/webrtc-video-service.ts:19` |
| **Category** | Infrastructure / In-memory state (multi-replica) |
| **Status** | fixed — 2026-06-02 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-06-02 |

**Problem:** Active call/session state was held in in-memory `Map` objects across call services, causing cross-replica session loss after scale-out.

**Fix:** Replaced process-local maps with a shared distributed call-session store (`server/services/distributed-call-session-store.ts`) backed by Redis when configured, with participant indexing and async retrieval across replicas. Updated call consumers (`messaging-router.ts`) and tests to use async session lookups.

---

## What's Good — Reinforce These Patterns

- ✅ **Auth core is clean.** `protectedProcedure` in `trpc.ts`, `adminProcedure`, `architectProcedure` all correctly structured. The middleware chain is easy to extend.
- ✅ **No Next.js drift.** Zero `next/navigation`, `NextResponse`, or App Router patterns anywhere. wouter used correctly throughout.
- ✅ **`getUserRfqs` correctly ignores `input.userId`** in favor of `ctx.user.id` (line 232) — the right instinct, just not applied consistently to the other procedures.
- ✅ **`SupplierOnboarding.tsx` is well-structured.** 6-step stepper with per-step validation, pre-fill from existing profile, proper sonner toasts, shadcn/ui primitives, wouter navigation — no issues.
- ✅ **Drizzle used correctly** throughout `supplier-rfq-router.ts` — clean `eq()`, `and()`, proper scoping of bid ownership to `ctx.user.id`-derived supplier ID.
- ✅ **No secrets in source.** No hardcoded API keys, client secrets, or tokens found in any server file.
- ✅ **Fire-and-forget side effects** (email sends) use correct `void import(...).then(...).catch(...)` pattern.
- ✅ **Open redirect protected** in OAuth initiation (`/^\/(?!\/)/.test(rawReturnPath)`) and Forma extension callback whitelist.

---

## Merge Recommendation

**Do not deploy to prod until 20260522-001 through 20260522-006 are fixed.**

The data leak in `getWithBids` + `getRfqDetails` means any authenticated user can enumerate RFQ IDs and read competitor bid prices today. The `sendMessage` identity spoof (003) and role regression bug (006) are also P0.

The rest can be batched into a follow-up PR.

---

---

## P1 — Compliance / Retention (Added 2026-05-22)

---

### 20260522-019

| Field | Value |
|-------|-------|
| **File** | `server/rfq-router.ts`, `server/rfq-service.ts`, any delete path |
| **Category** | Compliance / Data retention |
| **Status** | fixed — 2026-06-10 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-06-10 |

**Fix:**

- Audit all delete paths in `rfq-router.ts`, `rfq-service.ts`, and any admin routes that touch these tables
- Convert hard deletes to soft deletes: add a `deletedAt: timestamp nullable` column (Drizzle migration) and filter `where(isNull(rfqs.deletedAt))` in all read queries
- Add a `retentionExpiresAt` computed field if you want automatic archival after 7 years
- Never expose a "permanent delete" button in the UI for RFQ records — only "archive"

---

### 20260522-020

| Field | Value |
|-------|-------|
| **File** | No file — missing feature |
| **Category** | Compliance / CCPA + privacy |
| **Status** | fixed — 2026-06-10 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-06-10 |

**Problem:** Privacy policy publishes `privacy@greenchainz.com` and `dpo@greenchainz.com` for access, correction, and deletion requests with stated response timelines. There is no back-office flow in the app to actually service these requests. Until one exists, any CCPA or GDPR data subject request has to be handled manually with raw SQL — slow, error-prone, and auditable only if documented.

**Fix (minimal viable):**

- Admin route: `GET /admin/user-data-export?userId=X` — returns all data for a given user (RFQs, bids, messages, profile) as JSON, for copy to the requestor
- Admin route: `POST /admin/user-data-deletion-request` — creates a `dataSubjectRequests` log entry (requestedAt, type: access|correction|deletion, status: pending) so requests are tracked
- Actual deletion: soft-delete profile + anonymize PII fields (`name → "[deleted]"`, `email → anonymized hash`) after the 7-year retention window expires
- Hard requirement: get this to `alpha-ready` before any enterprise supplier signs; you need to be able to say "we can honor a deletion request" in an MSA

---

## P2 — Product / Data Model (Added 2026-05-22)

---

### 20260522-021

| Field | Value |
|-------|-------|
| **File** | `drizzle/schema.ts` — `rfqs` and `rfqBids` tables |
| **Category** | Product / Missing first-class fields |
| **Status** | fixed — 2026-06-10 |
| **First seen** | 2026-05-22 |
| **Last checked** | 2026-06-10 |

**Problem:** RFQ data model treats carbon/sustainability as optional notes (`notes: text`), not first-class fields. This means GWP caps, EPD requirements, and per-material carbon targets are freeform strings that can't be queried, scored, or compared across bids. The product doctrine requires cost–schedule–carbon as co-equal decision fields.

**Fix (schema additions):**

```sql
-- rfqs table additions
gwpCapPerUnit        decimal(10,4)   -- max kgCO2e per unit (null = no hard cap)
gwpCapUnit           varchar(50)     -- e.g. "kgCO2e/m3"
gwpReductionTarget   decimal(5,2)    -- % below regional baseline (null = not set)
epdRequired          boolean         -- if true, bids without EPD link are non-compliant
schedulePriority     smallint        -- 1-5 buyer weight for schedule vs cost vs carbon
costPriority         smallint
carbonPriority       smallint

-- rfqBids table additions
gwpPerUnit           decimal(10,4)   -- reported GWP from supplier EPD
epdUrl               text            -- URL to EPD document
gwpMeetsTarget       boolean         -- computed: gwpPerUnit <= rfqs.gwpCapPerUnit
```

These fields enable the composite bid scoring UI and make "show all materials with carbon badges" queryable at the DB level, not just UI-layer calculated.

---

*Last full scan: 2026-06-10 | Next scheduled rescan: 2026-06-17*
