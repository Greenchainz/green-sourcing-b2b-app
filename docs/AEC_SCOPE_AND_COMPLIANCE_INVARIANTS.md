# AEC Scope & Compliance Invariants

> **Status: binding.** These are invariants, not suggestions. Implementation in
> PR #900 (CSI Form 1.5C generator, Submittal Log, MasterFormat codes) and all
> future GreenChainz substitution/sourcing features MUST NOT violate them.
> Authored at the founder's direction via Copilot chat.

---

## Invariant 1 — Compliance is a GATE; sustainability is the RANKING

GreenChainz must **never** recommend, rank, or default to a material that fails a
hard compliance check — no matter how much lower its embodied carbon is.

These are two different axes, enforced in this exact order:

### Step 1 — GATE (pass/fail): compliance showstopper checks
A candidate material is **eligible only if it passes ALL** hard checks in the
Swap Validation Engine, including (where applicable):
- matching / equivalent **ASTM** standard
- **fire rating**
- **structural** (compressive / tensile strength)
- **thermal** (R-value)
- **acoustic** (STC)
- **UL / ICC-ES** listing
- any other showstopper check

A candidate that fails **any** showstopper is **removed from the result set**. It
is never shown as a ranked option, never defaulted to, never placed in a 1.5C or
13.1A packet.

### Step 2 — RANK (sort order): sustainability first, then persona weighting
**Among the candidates that passed the gate**, sort greenest-first (lowest
GWP / embodied carbon), then apply persona-weighted composite scoring (CCPS).
The greener **compliant** option should be the highlighted default.

### Why this ordering matters (liability shield)
An architect can never be shown a non-compliant product, so there is nothing
non-compliant for them to act on. Sustainability changes the **order** of safe
options; it never overrides the safety floor. **Any code path that could surface
a greener-but-non-compliant material above a compliant one is a defect.**

Applies to: `architect-spec-matcher`, swap validation, the CSI **1.5C** and
**13.1A** generators, and RFQ supplier match. Substitution packets must only ever
contain a substitute that passed the gate, and must include the showstopper-check
summary as evidence.

---

## Invariant 2 — Submittal Log scope: substitution artifacts ONLY (do not build Procore)

The Submittal Log tracks the status of the substitution / swap packets that
**GreenChainz itself generated** (the green swaps) — and nothing else. It answers
exactly one question:

> **"Did the greener substitution we proposed actually get approved?"**

### ✅ IN SCOPE (build this)
- Status tracking for **GreenChainz-generated substitution packets only** (the CSI 1.5C / 13.1A green swaps).
- Status lifecycle: `draft → submitted → approved_as_noted → revise_and_resubmit → rejected → closed`.
- Link each submittal to its originating **swap validation id** and/or **RFQ id**, the related **material(s)**, and **supplier(s)**.
- "Ball in court" (buyer / architect / supplier) **only** as it pertains to that substitution packet.
- Dates relevant to the substitution: `submittedAt`, `dueAt` / `requiredOnSiteAt`, `returnedAt`.
- **MasterFormat section code** on the submittal for categorization.

### ❌ OUT OF SCOPE (do NOT build — this is Procore territory and adds liability)
- General submittals for **every** product on the job (only our substitutions).
- **RFI** workflow (e.g., AIA G716).
- **Payment certification** (AIA G702 / G703).
- Whole-project ball-in-court tracking beyond our substitution packets.
- Schedule / lead-time management for items we did not propose.

### The boundary rule
If the Submittal Log ever starts tracking something GreenChainz did **not** itself
propose as a substitution, it has crossed into general construction administration
(Procore) and **violates this invariant**. Keep it scoped to our green swaps.

---

## One-line summary for reviewers
**Compliance is the floor you stand on; sustainability is the hero and the sort
order. The Submittal Log only tracks the fate of our green swaps — never the whole job.**
