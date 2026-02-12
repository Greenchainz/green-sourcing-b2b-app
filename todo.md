# GreenChainz B2B App - TODO

## Core Platform

- [x] Authentication system (Manus OAuth)
- [x] Dev server running
- [x] Branded landing page with hero, tools section, CTA
- [x] Header navigation (About, Materials, Assemblies, RFQ, Compare)
- [x] Footer with product/company/legal links and social icons
- [x] About page with company story
- [x] Intercom chat widget integrated (cqtm1euj) — REPLACED by ChainBot AI

## CCPS Algorithm & Database

- [x] Database schema: 12 tables (users, manufacturers, materials, assemblies, assembly_components, material_certifications, ccps_baselines, ccps_scores, decision_maker_personas, rfqs, rfq_items, leads)
- [x] CCPS scoring engine with 6 metrics (Carbon, Compliance, Certification, Cost, Supply Chain, Health)
- [x] Persona-specific weighting (Architect, LEED AP, GC PM, Spec Writer, Owner, Facility Manager)
- [x] Seed data: 22 materials, 7 manufacturers, 10 assemblies, 5 baselines, 7 personas
- [x] tRPC API procedures for materials, assemblies, CCPS, RFQ, personas, leads
- [x] CCPS engine unit tests (48 tests passing)

## Materials Catalog (Sweets-Style)

- [x] Materials Catalog page with search bar, role selector, filters
- [x] Material cards with CCPS gauge, 6 sub-scores, certification badges
- [x] GWP, Price, Lead Time displayed per card
- [x] Compare and RFQ buttons on each card
- [x] Material Detail page with full CCPS breakdown
- [x] Score by Decision-Maker Persona section on detail page
- [x] Manufacturer sidebar with website link
- [x] EPD information section
- [x] Tabs: CCPS Breakdown, Specifications, Certifications, Alternatives

## Assembly Systems

- [x] Assemblies page with EWS assembly types
- [x] Good/Better/Best sustainability tier badges
- [x] Embodied Carbon per 1000 SF display
- [x] Assembly type and tier filters
- [x] Assembly detail view with component breakdown

## RFQ System

- [x] RFQ Cart page with project details form
- [x] Add to RFQ from material cards and detail page
- [x] Project Name, Location, Type, Notes fields
- [x] Submit RFQ button (requires auth)
- [ ] RFQ submission notification to owner
- [ ] RFQ status tracking dashboard
- [ ] Supplier response flow

## Material Comparison

- [x] Compare page with side-by-side CCPS comparison
- [x] Add to Compare from material cards
- [x] Empty state with Browse Materials CTA

## Tool Landing Pages

- [x] Excel Audit tool page with email capture
- [x] Browser Extension tool page with email capture
- [x] Revit Plugin tool page with email capture
- [x] Submittal Generator tool page with email capture

## Lead Capture

- [x] Leads table in database
- [x] Lead capture form component
- [x] tRPC lead.capture procedure

## Agent Data Access Layer

- [x] API endpoints accessible by Azure AI agents (same tRPC endpoints)
- [x] Material search API for agent queries
- [x] CCPS calculation API for agent use
- [x] RFQ creation API for agent-initiated quotes

## Future Enhancements

- [ ] Supplier Portal (dashboard, RFQ responses, product management)
- [ ] Admin Dashboard (user management, verification queue)
- [ ] Real-time notifications
- [ ] Mobile responsiveness improvements
- [ ] EPD data scraper integration (EC3, Building Transparency, Autodesk SDA)
- [ ] Pricing API integration (RS Means, Dodge)


## AI Agent Architecture

- [x] Design comprehensive agent architecture document (AGENT_ARCHITECTURE.md)
- [x] Replace dual Intercom+AI widget with single branded GreenChainz AI chat
- [x] Build unified chat widget (ChainBot — replaces Intercom for user-facing)
- [x] Implement Triage/Router agent that classifies user intent (keyword + LLM + context routing)
- [x] Implement Material Intelligence agent (CCPS queries, search_materials, get_material_detail tools)
- [x] Implement RFQ Assistant agent (validates cart, enriches RFQ, matches suppliers)
- [ ] Implement Compliance Advisor agent (code checks, LEED credit calculations) — scaffolded, needs tools
- [ ] Implement Supplier Concierge agent (for supplier-side interactions)
- [ ] Agent-assisted RFQ workflow (validation, enrichment, supplier matching, response analysis)
- [ ] Human handoff to Intercom when agent can't resolve
- [x] tRPC agent.chat procedure with LLM integration
- [x] Agent context injection (user persona, current page, cart state)
- [x] Agent system unit tests (16 tests passing)
- [x] Database tables for agent conversations and analytics
- [x] ChainBot floating widget with suggested prompts, minimize, close
- [x] Agent specialist badges in chat (Material Intelligence, RFQ Assistant, Support)
- [x] Intercom widget removed from frontend (kept as backend escalation channel)


## RFQ Marketplace System (Phase 2)

- [x] Database schema: suppliers, supplier_subscriptions, supplier_filters, rfq_bids, rfq_messages, rfq_threads tables (schema defined, migrations pending DB)
- [x] RFQ service with supplier matching algorithm (premium window, location, filters, CCPS alignment)
- [x] Supplier matching with match score calculation (0-100)
- [x] RFQ submission with auto-enrichment via CCPS
- [x] Bid submission and tracking with 7-day expiration
- [x] Bid acceptance and RFQ closure logic
- [x] Message thread creation and management (buyer + supplier private 1:1 conversations)
- [x] Message sending with 1000-char limit (encourages brevity)
- [x] Message read tracking and thread analytics
- [x] RFQ analytics (total bids, avg/min/max price, winning bid, purchase date)
- [x] tRPC API procedures for all RFQ marketplace operations (rfqMarketplace router)
- [x] RFQ service unit tests (21 tests passing)
- [x] Database migrations (create supplier and RFQ tables)
- [x] Supplier dashboard UI (matching RFQs, active threads, bids, bid submission form)
- [x] Buyer RFQ dashboard UI (view RFQs, compare bids, accept/reject, track status)
- [x] Notification service (email, SMS, in-app templates and delivery)
- [x] Notification tRPC procedures (getUnread, markAsRead, send)
- [x] Notification service unit tests (14 tests passing)
- [ ] Supplier registration and profile management UI
- [ ] Premium tier subscription flow (Microsoft payment processing)
- [ ] Supplier filter setup UI (location, material types, lead time, price range)
- [ ] Real-time messaging with Azure Web PubSub (WebSocket)
- [ ] Message thread UI (buyer + supplier private conversation)
- [ ] Direct purchase option (buy now at listed price)
- [ ] Email notifications via Azure SendGrid (RFQ match, new message, bid accepted)
- [ ] SMS notifications via Azure Communication Services
- [ ] In-app notification center with badge counts
- [ ] Commission tracking for Azure service usage
