# Sales Psychology — How We Sell The Marketplace

> Distilled from Part VII of "Sustainable Material Supplier Ecosystem
> Analysis" (2026). These four frameworks are how GreenChainz positions
> itself to suppliers. **They are not marketing copy. They are the product
> strategy.** Every feature should map to at least one of these.
>
> Typed module: [`lib/research/salesPsychology.ts`](../../lib/research/salesPsychology.ts).
> Related: [`GROWTH_STRATEGY.md`](../GROWTH_STRATEGY.md),
> [`DEFENSIBILITY_AGENT.md`](../DEFENSIBILITY_AGENT.md).

---

## Framework 1 — The Trojan Horse Of EPD Verification

**Thesis:** suppliers have superior products but lack third-party
certifications (EPDs, HPDs). GreenChainz offers the technical bridge —
organize their test data, guide them through EPD generators, then position
them as "verified" on the platform.

**Mechanism:** Many bio-cement startups, hemp manufacturers, and mycelium
companies are locked out of specification workflows because architects fear
unproven materials. Spec Writers demand ASTM compliance, LCA data, EPD
docs. GreenChainz offers a **Certification Concierge** service — help
suppliers organize test data, walk them through One Click LCA / EC3 /
EPD International / EPD Hub, then surface their "verified" badge in the
marketplace. Their science-project reputation converts to "spec-ready."

**When to deploy:** first conversation with any supplier expressing
frustration over failure to penetrate Gensler / HOK / AECOM because they
lack certifications.

**GreenChainz implementation:**
- **Founding 50 tier** gets assisted EPD generation.
- **Verified Badge** visible on profile + in Interceptor suggestions.
- **Interceptor** flags them when a Spec Writer searches for "verified
  sustainable alternatives to [competitor]."
- Platform **does not need to issue certifications itself** — it brokers
  access to existing third-party programs. This is a partnership /
  outreach priority (One Click LCA, EC3, EPD International, EPD Hub, SCS
  Global, UL, Smart EPD, Climate Earth, NRMCA, NAPA).

---

## Framework 2 — The Interceptor (The Killer Feature)

**Thesis:** suppliers are exhausted by passive directory listings (Sweets,
ThomasNet). GreenChainz injects them directly into architect workflows at
the **moment of specification decision** (in Revit or Forma), circumventing
competitor default choices.

**Mechanism:** Traditional directories are push-based — suppliers wait for
phone calls. GreenChainz is pull-based — an architect is actively choosing
a material in their CAD model and the Interceptor pops up:
> "Did you know you can achieve 4000 PSI with 40% less carbon using
> Brimstone? ASTM C150 compliance attached."

This interrupts the specifier's habit loop and forces consideration. To
suppliers, this is **God Mode** — direct access to the exact moment the
decision is made.

**When to deploy:** after establishing supplier pain (long sales cycles,
gatekeepers, low phone-call conversion). Show a prototype or recorded
demo: "When an architect on this project specifies concrete, you'll be
there."

**GreenChainz implementation:**
- **Revit add-in** and **Forma extension** trigger Interceptor logic.
- When a material type is selected, platform queries DB for
  carbon/performance alternates.
- Supplier gets **impression data** — how many times were you intercepted?
- Data becomes sales collateral: "You were suggested to 500 architecture
  firms in Q1."
- **`InterceptorTrigger` grammar is locked** in
  `lib/research/salesPsychology.ts` — do not invent new shapes.

---

## Framework 3 — Tiered Membership (Founding 50)

**Thesis:** segmented pricing and service levels create urgency for early
adopters while protecting cash-poor startups via performance-based pricing
(pay when you win specs, not upfront subscription).

**Mechanism:**

- **Tier 1 — Founding 50 / Gatekeeper**
  - Deep integration, Interceptor-preferred status
  - Direct access to data analytics (who searched, when, how many)
  - Assisted EPD / FSC certification via Concierge
  - Verified Badge prominence
  - Annual fee **or** performance-based (revenue share on resulting projects)

- **Tier 2 — General Verified**
  - Directory listing, algorithm can pick them
  - Interceptor shows them only if no Tier 1 competitor exists
  - Basic analytics

- **Tier 3 — Basic**
  - Profile only, passive listing

Early adopters pay a premium for **guaranteed visibility + Gatekeeper
status** (first suggestion, not fallback). Scarcity + FOMO. Later entrants
pay less but get commodity placement.

**When to deploy:** launch phase — recruit first 50 suppliers across major
categories (concrete, timber, hemp, mycelium) with aggressive terms
(discounted Tier 1, early-mover analytics bonus).

**GreenChainz implementation:**
- Tiered role in Interceptor algorithm (weighting by tier).
- Dashboard showing impression / lead data.
- Annual renewal contingent on engagement metrics.
- `TierStatus` enum in `lib/research/salesPsychology.ts`.

---

## Framework 4 — Hard Sell Counter: The Cost Of Invisibility

**Thesis:** cash-poor startups resist "another subscription." Reframe cost
not as marketing expense but as existential survival in the age of carbon
regulation.

**Mechanism:** Startups resist subscription because margins are thin or
runway is short. Counter:
> "The cost of NOT being on this platform is invisibility. If you're not
> in the digital carbon calculator, you don't exist to the modern
> architect. We are your digital twin. One specification pays for the
> subscription for ten years."

Sell urgency: NYC Local Law 97, CA Title 24, LEED v5 are forcing architects
to use digital tools to calculate embodied carbon. Those tools will all
integrate GreenChainz. **If your product isn't in GreenChainz, it's not in
their carbon models. If it's not in their models, it doesn't get
specified.** Existential threat.

**When to deploy:** when a high-technical-merit, low-cash supplier hesitates
on pricing.

**GreenChainz implementation:**
- **Freemium tier** for early-stage startups — basic profile, limited
  Interceptor impressions.
- They pay only when a spec results in a real project — **revenue share**
  (5–10% of material invoice or project gross margin). Lower risk, higher
  upside.
- Route to Tier 1 once the supplier has proof of revenue through the
  platform.

---

## Putting The Four Together — Supplier Journey

1. **Discovery (scrapers + hunter agents)** — identify sustainable
   supplier with high technical merit but low market visibility.
2. **First touch — Hard Sell Counter copy:** "Invisibility in the age of
   carbon regulation."
3. **Qualification — Trojan Horse:** do they have EPDs? If no → offer
   Certification Concierge.
4. **Pitch — Interceptor demo:** show the moment in Revit/Forma where they
   get surfaced.
5. **Close — Tiered Membership:** Founding 50 if flagship, Freemium if
   cash-poor but promising.
6. **Renew — Metrics:** impressions + specs earned drive annual renewal.

---

## Key Verbatim Quotes (Load-Bearing)

> "The 'Hard Sell' for these companies is not a lecture on sustainability;
> these founders and executives are often mission-driven and already
> converted. The pitch is about survival through visibility."

> "When an engineer selects 'Generic Concrete 4000 PSI,' the tool prompts:
> 'Did you know you can achieve 4000 PSI with 40% less carbon using? Here
> is the ASTM C150 compliance report.' This interrupts the habit loop of
> the specifier."

> "The cost of not being on this platform is invisibility in the age of
> Carbon Regulation. If you aren't in the digital carbon calculator, you
> don't exist to the modern architect. We are your digital twin."

---

## How To Use This File

- **Outreach copy** must open with Hard Sell Counter language for
  cash-poor startups, Trojan Horse language for cert-poor suppliers,
  Interceptor demo language for established suppliers frustrated with
  directory listings.
- **Onboarding flow** must let suppliers self-select into a tier (Founding
  50, Verified, Basic / Freemium) based on their readiness and willingness
  to commit.
- **Material Credit Score** must aggregate the signals that matter to
  Spec Writers (verified, EPD status, spec count, cost premium).
- **Interceptor UI** must always cite ASTM / code compliance data when
  suggesting an alternate — never pitch on carbon alone.
