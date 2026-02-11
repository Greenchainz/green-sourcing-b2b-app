# GreenChainz AI Agent Architecture

**Version 1.0 — February 2026**
**Author:** Manus AI for GreenChainz Inc.

---

## 1. Executive Summary

This document defines the complete AI agent architecture for the GreenChainz platform. The architecture follows a **Handoff Orchestration** pattern — a single entry-point agent (the Router) classifies user intent and delegates to specialized domain agents, each with its own tools, knowledge, and system prompt. This mirrors the Azure Architecture Center's recommended pattern for customer-facing systems where "the optimal agent for a task isn't known upfront" and "expertise requirements emerge during processing." [1]

The critical design decision is that **GreenChainz replaces the dual-widget problem** (Intercom chat + separate AI assistant) with a **single branded chat interface** called **ChainBot**. ChainBot is the user-facing product feature — not a support tool. It answers material questions, validates RFQs, calculates LEED credits, and only hands off to a human (via Intercom's backend API) when it reaches its capability limits. One widget. Zero clutter.

The architecture uses **5 specialized agents** orchestrated by a Router, with the RFQ lifecycle as the primary value-creation workflow where agents touch every step from cart validation through supplier response analysis.

---

## 2. The Intercom Problem — Solved

The current implementation has two competing chat widgets on every page: Intercom (support) and a potential AI assistant (product). This creates UX clutter and confuses users about where to ask questions.

| Approach | User Experience | Data Capture | Cost |
|---|---|---|---|
| **Intercom only** | Support-only; can't answer "what insulation has lowest GWP for LEED Gold?" | Conversations stored in Intercom | $74/seat/month |
| **AI widget only** | Smart but no human fallback; dead end when agent can't help | Conversations in your DB | LLM API costs only |
| **Both widgets** | Cluttered; user doesn't know which to use | Split across two systems | Both costs combined |
| **ChainBot (recommended)** | Single widget handles everything; seamless human handoff when needed | All conversations in your DB + Intercom gets escalations | LLM API + Intercom (reduced seats) |

The recommended approach keeps Intercom as a **backend escalation channel** — when ChainBot determines it needs a human, it creates an Intercom conversation via the API and notifies the user. The user never sees the Intercom widget directly. All conversation history stays in the GreenChainz database, giving you full analytics on what architects are asking, which materials they're comparing, and where they get stuck.

---

## 3. Agent Inventory

The system uses 5 specialized agents plus a Router. Each agent has a distinct domain, system prompt, tool access, and escalation path. The design follows the principle that "individual agents can focus on a specific domain or capability, which reduces code and prompt complexity." [1]

### 3.1 Agent Overview

| Agent | Codename | Visibility | Primary Users | Orchestration Role |
|---|---|---|---|---|
| **Router Agent** | `router` | Invisible (runs on every message) | All users | Classifies intent, delegates to specialist |
| **Material Intelligence** | `materials` | User-facing | Architects, LEED APs, Spec Writers | Answers material questions, runs CCPS, finds alternatives |
| **RFQ Assistant** | `rfq` | User-facing | Architects, GC PMs, Procurement | Validates carts, enriches RFQs, matches suppliers, analyzes responses |
| **Compliance Advisor** | `compliance` | User-facing | Spec Writers, LEED APs, Code Officials | Code checks, LEED credit calculations, EPD validation |
| **Supplier Concierge** | `supplier` | User-facing (supplier portal) | Suppliers | Helps suppliers optimize listings, respond to RFQs, understand scoring |
| **Platform Support** | `support` | User-facing (fallback) | All users | General help, account issues, human handoff to Intercom |

### 3.2 Router Agent

The Router is invisible to the user. Every message passes through it first. It classifies the user's intent using a lightweight LLM call with structured output and routes to the appropriate specialist. If the specialist can't handle the request, it hands back to the Router, which tries the next best agent or escalates to Support.

**System Prompt Core:**
```
You are the GreenChainz routing agent. Classify the user's message into one of these categories:
- MATERIALS: Questions about specific materials, comparisons, alternatives, carbon data, EPDs, certifications
- RFQ: Anything related to quotes, pricing, ordering, cart, suppliers, procurement
- COMPLIANCE: Code compliance, LEED credits, building codes, standards (ASTM, Title 24, IECC), fire ratings
- SUPPLIER: Supplier-specific questions (only when user is a supplier role)
- SUPPORT: Account help, platform questions, bug reports, or anything that doesn't fit above
- HANDOFF: User explicitly asks for a human

Return JSON: { "agent": "materials|rfq|compliance|supplier|support", "confidence": 0.0-1.0, "reasoning": "..." }
```

**Routing Rules:**
1. If confidence < 0.6, route to `support` with the reasoning attached.
2. If user says "talk to a human" / "real person" / "agent" → immediate `HANDOFF` to Intercom.
3. If the current specialist returns `ESCALATE`, try the next-best agent. If all specialists fail, escalate to human.
4. Context from the current page (material detail, RFQ cart, assembly view) biases the routing — if the user is on `/materials/5` and asks "is this good?", route to `materials` even without explicit material keywords.

### 3.3 Material Intelligence Agent

This is the flagship agent — the one that makes GreenChainz feel "almost as comprehensive as you." It has full read access to the materials database, CCPS engine, and assembly data.

**Capabilities (Tools):**

| Tool | Function | Example Query |
|---|---|---|
| `searchMaterials` | Full-text search with CCPS ranking | "Find me low-carbon insulation for exterior walls" |
| `getMaterialDetail` | Retrieve full material record + CCPS breakdown | "Tell me about Rockwool ComfortBoard" |
| `compareMaterials` | Side-by-side CCPS comparison with carbon delta | "Compare mineral wool vs XPS for EWS-2A" |
| `findAlternatives` | Near-match algorithm — find substitutes for a given material | "What can I use instead of aluminum curtain wall?" |
| `getAssemblyBreakdown` | Full assembly components with embodied carbon per 1000 SF | "Show me the EWS-3B UHPC assembly" |
| `calculateCarbonDelta` | Compute carbon savings between two materials or assemblies | "How much carbon do I save switching from EWS-1A to EWS-3B?" |
| `getPersonaScore` | Recalculate CCPS with different persona weights | "Score this material as a LEED AP would" |

**System Prompt Core:**
```
You are ChainBot's Material Intelligence specialist for GreenChainz, the B2B sustainable 
building materials platform. You help architects, LEED APs, spec writers, and procurement 
officers find, compare, and evaluate sustainable building materials.

KEY PRINCIPLES:
- Decision-makers don't buy green to save the planet. They buy green because the alternative 
  (inefficiency, toxicity, non-compliance) is a quantifiable financial liability.
- Always present data in terms the user's persona cares about:
  * Architects → Carbon Delta + Code Compliance + Liability
  * LEED APs → Certification coverage + LEED credit contribution
  * GC PMs → Cost + Lead Time + Regional Availability
  * Spec Writers → EPD validity + ASTM standards + Fire Rating
- When comparing materials, always show the Carbon Delta (% savings vs baseline).
- When recommending alternatives, explain WHY in business terms, not environmental terms.
- If you don't have data for a specific material, say so and suggest the user submit an RFQ 
  to get supplier-verified data.
```

### 3.4 RFQ Assistant Agent

This agent transforms the RFQ from a dumb form into an intelligent procurement workflow. It participates at every stage of the RFQ lifecycle.

**RFQ Lifecycle — Agent Touchpoints:**

| Stage | Agent Action | Value Added |
|---|---|---|
| **1. Cart Building** | Validates material selections against project requirements; flags conflicts (fire rating mismatch, dimensional incompatibility, expired EPDs) | Prevents bad RFQs from going out |
| **2. Pre-Submission Review** | Auto-enriches RFQ with CCPS data, carbon delta calculations, LEED credit contributions, compliance summaries | Makes the RFQ compelling for suppliers |
| **3. Supplier Matching** | Matches RFQ to best suppliers based on regional availability, lead time, pricing tier, and product category | Reduces time-to-response |
| **4. Response Analysis** | Analyzes supplier responses, compares against original spec, flags deviations, calculates total project carbon impact | Saves hours of manual comparison |
| **5. Decision Support** | Summarizes all responses side-by-side with a recommendation ranked by the user's persona-weighted CCPS | Converts data into action |

**Capabilities (Tools):**

| Tool | Function |
|---|---|
| `validateCart` | Check all cart items for conflicts, missing data, expired EPDs |
| `enrichRfq` | Add CCPS scores, carbon deltas, LEED credits, compliance data to RFQ |
| `matchSuppliers` | Find best suppliers for the RFQ based on material categories and location |
| `analyzeResponse` | Compare supplier response against original spec |
| `summarizeResponses` | Side-by-side comparison of all supplier responses with recommendation |
| `generateRfqPdf` | Generate formatted RFQ document (PDF) |

**System Prompt Core:**
```
You are ChainBot's RFQ Assistant for GreenChainz. You help users build, validate, submit, 
and evaluate Requests for Quote for sustainable building materials.

KEY PRINCIPLES:
- An RFQ is not a form — it's a procurement document that represents real money and real 
  project timelines. Treat every RFQ with the seriousness of a $500K purchase order.
- Always validate before submission: check fire ratings match, EPDs aren't expired, 
  dimensional specs are compatible, and the assembly makes structural sense.
- When enriching an RFQ, add the Carbon Delta vs. conventional baseline — this is what 
  makes the architect's case to the owner.
- When analyzing supplier responses, flag any deviations from the original spec and 
  quantify the impact (cost delta, carbon delta, schedule delta).
- If a supplier's response looks incomplete, suggest follow-up questions the user should ask.
```

### 3.5 Compliance Advisor Agent

This agent is the "defensive specs" engine — it helps spec writers and LEED APs verify that materials meet code requirements before they go into a project.

**Capabilities (Tools):**

| Tool | Function |
|---|---|
| `checkBuildingCode` | Verify material against IBC, Title 24, IECC requirements |
| `calculateLeedCredits` | Determine which LEED v4.1/v5 credits a material contributes to |
| `validateEpd` | Check EPD validity, expiration, program operator |
| `checkFireRating` | Verify fire rating against project requirements (ASTM E119/E84) |
| `assessHealthCompliance` | Check VOC levels, Red List status, CDPH v1.2 compliance |
| `generateComplianceReport` | Create a compliance summary document for a material or assembly |

**System Prompt Core:**
```
You are ChainBot's Compliance Advisor for GreenChainz. You help spec writers, LEED APs, 
and architects verify that materials meet building code requirements, earn LEED credits, 
and satisfy health and safety standards.

KEY PRINCIPLES:
- Compliance is binary — a material either meets the code or it doesn't. Never hedge.
- Always cite the specific standard (e.g., "ASTM E119 1-hour fire rating" not just "fire rated").
- When calculating LEED credits, specify the exact credit path (e.g., "MR Credit: Building 
  Product Disclosure and Optimization - EPD" not just "LEED points").
- If an EPD is expired or missing, flag it as a HARD STOP — the material cannot be specified 
  without a valid EPD in any project targeting LEED or Buy Clean compliance.
- For health compliance, always check the Living Building Challenge Red List first.
```

### 3.6 Supplier Concierge Agent

This agent serves the other side of the marketplace — helping suppliers optimize their listings, respond to RFQs effectively, and understand how the CCPS scoring system works.

**Capabilities (Tools):**

| Tool | Function |
|---|---|
| `analyzeListingScore` | Show supplier how their products score and why |
| `suggestImprovements` | Recommend actions to improve CCPS score (get HPD, reduce lead time, etc.) |
| `draftRfqResponse` | Help supplier draft a response to an incoming RFQ |
| `explainScoring` | Explain how CCPS works and what each metric means |
| `benchmarkCompetitors` | Show how supplier's products compare to competitors in same category |

### 3.7 Platform Support Agent

The fallback agent for anything that doesn't fit the specialists. Handles account questions, platform navigation, and human handoff.

**Capabilities (Tools):**

| Tool | Function |
|---|---|
| `escalateToHuman` | Create Intercom conversation and notify support team |
| `getAccountInfo` | Retrieve user's account details, subscription, history |
| `navigateUser` | Provide links to relevant pages based on the question |
| `reportBug` | Log a bug report with context |

---

## 4. Orchestration Pattern: Handoff with Context Injection

The GreenChainz agent system uses a **Handoff Orchestration** pattern with **Context Injection**. This means:

1. Every message goes through the Router first (lightweight classification, ~200ms).
2. The Router delegates to a specialist with the full conversation history plus injected context.
3. The specialist processes the request using its tools and returns a response.
4. If the specialist determines it can't handle the request, it returns an `ESCALATE` signal with reasoning.
5. The Router tries the next-best agent or escalates to human support.

### 4.1 Context Injection

The key differentiator is **automatic context injection** — the system enriches every agent call with contextual information the user didn't explicitly provide. This is what makes ChainBot feel "almost as comprehensive as you."

| Context Source | Injected Data | Example |
|---|---|---|
| **Current Page** | URL path, material ID, assembly ID | User is on `/materials/5` → agent knows they're looking at "Rockwool ComfortBoard 80" |
| **User Persona** | Role from profile (Architect, LEED AP, GC PM, etc.) | CCPS weights automatically adjusted for their role |
| **Cart State** | Current RFQ cart contents | Agent can reference "the 3 materials in your cart" without being told |
| **Conversation History** | Last 20 messages in the current session | Maintains context across multi-turn conversations |
| **Project Context** | Active project name, location, type (if set in RFQ) | "For your Downtown Office Tower project in Austin, TX..." |
| **Search History** | Last 5 material searches | "Earlier you were looking at mineral wool options..." |

### 4.2 Data Flow Diagram

```
User Message
    │
    ▼
┌─────────────┐     ┌──────────────────┐
│   Router     │────▶│ Context Injector  │
│   Agent      │     │ (page, persona,   │
│              │     │  cart, history)    │
└──────┬───────┘     └──────────────────┘
       │
       │ classify intent
       │
       ▼
  ┌────┴────┬────────┬──────────┬──────────┐
  ▼         ▼        ▼          ▼          ▼
Material  RFQ    Compliance  Supplier   Support
Agent    Agent    Agent      Agent      Agent
  │         │        │          │          │
  │    ┌────┴────┐   │          │          │
  │    │ Tools:  │   │          │          │
  │    │validate │   │          │          │
  │    │enrich   │   │          │          │
  │    │match    │   │          │          │
  │    └─────────┘   │          │          │
  │         │        │          │          │
  ▼         ▼        ▼          ▼          ▼
┌─────────────────────────────────────────────┐
│              Response to User                │
│  (or ESCALATE → Router tries next agent)     │
│  (or HANDOFF → Intercom API)                 │
└─────────────────────────────────────────────┘
```

### 4.3 Agent-to-Agent Communication

Agents don't talk to each other directly. The Router mediates all handoffs. However, agents can **invoke each other's tools** through the Router when needed. For example:

- The RFQ Assistant needs CCPS scores → it calls the Material Intelligence agent's `searchMaterials` tool via the shared tRPC layer (not agent-to-agent, but tool-to-tool).
- The Compliance Advisor needs material data → it reads from the same database the Material Intelligence agent uses.

This avoids the "infinite handoff loop" anti-pattern identified in the Azure Architecture Center guidance. [1]

---

## 5. The RFQ Agent Workflow — In Detail

The RFQ is the revenue-generating workflow. Here's exactly how agents participate at each stage:

### Stage 1: Cart Building (Proactive)

When a user adds a material to their RFQ cart, the RFQ Assistant runs a **background validation** (no user interaction required unless there's a problem):

```
Trigger: User clicks "Add to RFQ" on a material card
Agent Action:
  1. Check if material has valid EPD (not expired)
  2. Check if material's fire rating matches other cart items' assembly requirements
  3. Check if material is available in the project's region (if project location is set)
  4. If any check fails → show inline warning on the cart item
  5. If all checks pass → silent success (no interruption)
```

### Stage 2: Pre-Submission Review (Interactive)

When the user clicks "Submit RFQ," the agent intercepts and provides a review:

```
Trigger: User clicks "Submit RFQ"
Agent Action:
  1. Validate all cart items (same as Stage 1 but comprehensive)
  2. Auto-enrich each line item with:
     - CCPS score (using user's persona weights)
     - Carbon Delta vs. category baseline
     - LEED credit contributions
     - Compliance summary
  3. Generate a "RFQ Intelligence Brief" shown to the user:
     - Total estimated carbon savings vs. conventional alternatives
     - Total estimated LEED points contributed
     - Any compliance gaps or warnings
     - Recommended additional materials to consider
  4. User reviews and confirms → RFQ is submitted
```

### Stage 3: Supplier Matching (Automated)

After submission, the agent matches the RFQ to suppliers:

```
Trigger: RFQ submitted
Agent Action:
  1. For each line item, find suppliers who:
     - Manufacture that product category
     - Are available in the project's region
     - Have lead times within the project timeline
     - Have verified listings (prioritized over unverified)
  2. Rank suppliers by relevance score
  3. Send RFQ notification to top 3-5 suppliers per line item
  4. Notify the user: "Your RFQ has been sent to X suppliers"
```

### Stage 4: Response Analysis (Interactive)

When suppliers respond, the agent analyzes each response:

```
Trigger: Supplier submits RFQ response
Agent Action:
  1. Compare response against original spec:
     - Price vs. estimated price (flag if >15% deviation)
     - Lead time vs. requested timeline
     - Material specs vs. original requirements
     - Certifications provided vs. required
  2. Calculate CCPS score for the proposed material
  3. Calculate Carbon Delta vs. the originally specified material
  4. Flag any deviations with severity (INFO, WARNING, CRITICAL)
  5. Store analysis in database for the summary stage
```

### Stage 5: Decision Support (Interactive)

When the user views their RFQ responses, the agent provides a summary:

```
Trigger: User opens RFQ response view
Agent Action:
  1. Generate side-by-side comparison table:
     - Supplier name, price, lead time, CCPS score, carbon delta
  2. Highlight the recommended supplier (highest CCPS for user's persona)
  3. Provide natural language summary:
     "Based on your role as an Architect, Supplier A offers the best balance of 
      carbon performance (-42% vs baseline) and code compliance. Supplier B is 
      $3.20/SF cheaper but has a 2-week longer lead time and no HPD."
  4. Offer to generate a comparison PDF for stakeholder presentation
```

---

## 6. Implementation Architecture

### 6.1 Technology Stack

| Component | Technology | Rationale |
|---|---|---|
| **Chat UI** | Custom React component (based on AIChatBox template) | Full control over UX, no third-party widget dependency |
| **Router Agent** | tRPC procedure + LLM with structured output (JSON schema) | Fast classification (~200ms), type-safe |
| **Specialist Agents** | tRPC procedures + LLM with function calling | Each agent has its own system prompt and tool definitions |
| **LLM Provider** | Manus Forge API (gemini-2.5-flash) | Pre-configured, no additional API keys needed |
| **Tool Execution** | Direct database queries via Drizzle ORM | Agents call the same DB helpers the frontend uses |
| **Conversation Storage** | MySQL table (`agent_conversations`) | Full history for analytics and context |
| **Human Handoff** | Intercom API (create conversation) | Existing Intercom account, backend-only |
| **Context Injection** | Client-side metadata sent with each message | Page URL, cart state, persona from user profile |

### 6.2 Database Schema Additions

```sql
-- Agent conversation history
CREATE TABLE agent_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255),           -- NULL for anonymous users
  session_id VARCHAR(255) NOT NULL, -- Browser session ID
  agent VARCHAR(50) NOT NULL,      -- Which agent handled this message
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  metadata JSON,                   -- Context injection data, tool calls, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent analytics
CREATE TABLE agent_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  agent VARCHAR(50) NOT NULL,
  intent_classified VARCHAR(100),
  confidence DECIMAL(3,2),
  tools_used JSON,                 -- Array of tool names invoked
  response_time_ms INT,
  escalated BOOLEAN DEFAULT FALSE,
  handed_off_to_human BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.3 tRPC API Structure

```typescript
// server/routers.ts additions
agent: router({
  // Main chat endpoint — handles routing + specialist delegation
  chat: protectedProcedure  // or publicProcedure for anonymous browsing
    .input(z.object({
      message: z.string(),
      sessionId: z.string(),
      context: z.object({
        currentPage: z.string(),           // e.g., "/materials/5"
        materialId: z.number().optional(),  // If on a material page
        assemblyId: z.number().optional(),  // If on an assembly page
        cartItems: z.array(z.number()).optional(), // Material IDs in cart
        projectName: z.string().optional(),
        projectLocation: z.string().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Load conversation history
      // 2. Inject context
      // 3. Route to specialist
      // 4. Execute specialist with tools
      // 5. Store conversation
      // 6. Return response
    }),

  // Get conversation history for a session
  history: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => { ... }),

  // RFQ-specific agent actions (called programmatically, not via chat)
  validateCart: protectedProcedure
    .input(z.object({ materialIds: z.array(z.number()) }))
    .mutation(async ({ input }) => { ... }),

  enrichRfq: protectedProcedure
    .input(z.object({ rfqId: z.number() }))
    .mutation(async ({ input }) => { ... }),

  analyzeResponse: protectedProcedure
    .input(z.object({ rfqId: z.number(), responseId: z.number() }))
    .mutation(async ({ input }) => { ... }),
})
```

### 6.4 Chat Widget Implementation

The chat widget replaces both Intercom and any separate AI widget. It's a floating button in the bottom-right corner (same position Intercom currently occupies) that expands into a full chat interface.

**Key UX Decisions:**

1. **Floating button** shows the GreenChainz leaf icon (not a generic chat icon).
2. **Welcome message** adapts to user persona: "Hi! I'm ChainBot. I can help you find sustainable materials, validate your RFQ, or check code compliance. What are you working on?"
3. **Suggested prompts** change based on the current page:
   - On `/materials`: "Find low-carbon insulation", "Compare these materials"
   - On `/rfq`: "Review my cart", "Check compliance"
   - On `/assemblies`: "Explain this assembly", "Find alternatives"
4. **Agent indicator** shows which specialist is responding (small badge: "Material Intelligence" / "RFQ Assistant" / etc.)
5. **Escalation button** always visible: "Talk to a human" → creates Intercom conversation.

---

## 7. Agent Interaction with Azure Backend Agents

The GreenChainz platform has two agent layers:

| Layer | Location | Purpose | Agents |
|---|---|---|---|
| **Frontend Agents** (this document) | Manus webdev app | User-facing chat, RFQ workflow, material guidance | Router, Materials, RFQ, Compliance, Supplier, Support |
| **Backend Agents** (Azure) | Azure Container Apps | Data processing, EPD parsing, document intelligence, scraping | Audit Agent, Scraper Agent, Document Intelligence Agent |

The two layers communicate through the **shared database** and **API endpoints**:

- Frontend agents **read** material data that backend agents have **written** (scraped, parsed, validated).
- Frontend agents **write** RFQs and lead data that backend agents can **process** (match to suppliers, generate PDFs).
- Backend agents **update** CCPS baselines when new EPD data is ingested, which frontend agents use for scoring.

This separation ensures that user-facing agents are fast (they read from a pre-computed database) while backend agents handle the heavy lifting (scraping, parsing, AI document extraction) asynchronously.

---

## 8. Do You Need Multiple Agents?

**Yes, but not for the reason most people think.**

The question isn't "can one agent do everything?" — it can. A single agent with all tools would technically work. The question is whether it would work **reliably** and **predictably** at scale.

The Azure Architecture Center guidance is clear: "As the number of knowledge sources and tools increases, it becomes difficult to provide a predictable agent experience." [1] A single agent with 20+ tools and a massive system prompt will:

1. **Hallucinate tool calls** — it might try to validate an EPD when the user asked about pricing.
2. **Lose context** — a 4000-token system prompt dilutes the model's attention on the actual user query.
3. **Be untestable** — you can't unit test a monolithic agent; you can test 5 specialists independently.
4. **Be unoptimizable** — you can't tune the Material Intelligence agent's prompt without risking the RFQ Assistant's behavior.

The multi-agent approach costs slightly more in routing overhead (~200ms per message for the Router classification) but delivers dramatically better reliability, testability, and maintainability.

**However**, start with 3 agents for MVP, not 5:

| MVP Agent | Covers |
|---|---|
| **Material Intelligence** | Material questions + basic compliance checks |
| **RFQ Assistant** | Cart validation + RFQ enrichment + supplier matching |
| **Support** | Everything else + human handoff |

Add Compliance Advisor and Supplier Concierge in Phase 2 when you have enough conversation data to justify the specialization.

---

## 9. What Else Should You Add?

Beyond the 5 core agents, here are agent capabilities that would make GreenChainz comprehensive:

| Capability | Agent | Priority | Why |
|---|---|---|---|
| **Spec Sheet Parser** | Material Intelligence | High | User uploads a PDF spec sheet → agent extracts material requirements and finds matches |
| **LEED Scorecard** | Compliance Advisor | High | Running tally of LEED points accumulated across all specified materials in a project |
| **Carbon Budget Tracker** | Material Intelligence | Medium | "You've specified 45,000 kgCO2e so far. Your target is 40,000. Here are 3 swaps that get you under budget." |
| **Supplier Outreach Drafter** | RFQ Assistant | Medium | Auto-draft email to suppliers who haven't responded to an RFQ after 48 hours |
| **Bid Comparison Report** | RFQ Assistant | High | Generate a PDF comparing all supplier bids for stakeholder presentation |
| **Regulatory Alert** | Compliance Advisor | Low | Notify users when building codes change that affect their specified materials |
| **Assembly Optimizer** | Material Intelligence | Medium | "Your EWS-1A assembly with Option 3 framing has 20,597 kgCO2e/1000SF. Switching to Option 1 drops it to 8,234. Same performance, 60% less carbon." |
| **Voice Input** | Router | Low | Use Whisper API transcription for on-site material lookups via mobile |

---

## 10. Implementation Roadmap

| Phase | Deliverable | Timeline | Agents Active |
|---|---|---|---|
| **Phase 1: MVP** | ChainBot widget + Material Intelligence + RFQ Assistant + Support | 2-3 weeks | 3 agents |
| **Phase 2: Compliance** | Compliance Advisor + LEED Scorecard + EPD Validation | 2 weeks | 4 agents |
| **Phase 3: Supplier Side** | Supplier Concierge + Listing Optimization + RFQ Response Drafting | 2 weeks | 5 agents |
| **Phase 4: Advanced** | Spec Sheet Parser + Carbon Budget Tracker + Assembly Optimizer | 3 weeks | 5 agents + advanced tools |
| **Phase 5: Intelligence** | Conversation analytics dashboard + agent performance metrics + A/B testing | 2 weeks | Analytics layer |

---

## References

[1] Microsoft Azure Architecture Center, "AI Agent Orchestration Patterns," https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns

---

*Document prepared for GreenChainz Inc. — February 2026*
*Architecture designed for Handoff Orchestration with Context Injection, following Azure Architecture Center multi-agent design patterns.*
