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
- [x] RFQ status tracking dashboard (view submitted RFQs, bid status, timeline)
- [x] Bid comparison UI (side-by-side bid cards with supplier info, price, lead time)
- [x] Bid analytics (total bids, avg/min/max price, winning bid)
- [x] tRPC procedures: getUserRfqs, getRfqDetails
- [x] RFQ Dashboard page with tabs (All, Active, Awarded)
- [x] Add RFQ Status link to header navigation
- [ ] Bid acceptance/rejection flow with confirmation
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


## Azure Web PubSub Real-Time Messaging

- [x] Verify Azure Web PubSub credentials and connection string
- [x] Enhance WebPubSubManager with message routing and thread management
- [x] Build real-time message tRPC procedures (getAccessToken, sendMessage, getThreadMessages, markAsRead, broadcastTyping, closeThread)
- [x] Create RealTimeMessageThread component with typing indicators and read receipts
- [x] Add message status tracking (sent, delivered, read)
- [x] Integrate real-time messaging into Supplier Dashboard
- [x] Integrate real-time messaging into Buyer RFQ Dashboard
- [x] Add typing indicator broadcast and display (animated dots)
- [x] Add read receipt tracking and display
- [x] Build WebSocket reconnection logic with exponential backoff (5 attempts, max 30s delay)
- [x] Write comprehensive tests for real-time messaging (13 tests passing)
- [x] Test end-to-end buyer-supplier real-time communication


## Material Swap Intelligence

- [x] Fix TypeScript errors in RealTimeChat component
- [x] Fix JSX syntax error in App.tsx
- [x] Database: material_swaps table (materialId, swapMaterialId, swapReason, swapScore, swapTier, createdBy, confidence, usageCount)
- [x] Swap matching algorithm (compare specs: category, embodied carbon, certifications, price)
- [x] Swap score calculation (0-100 with confidence level)
- [x] Manual swap override (admin/agent can mark materials as swaps)
- [x] Track swap usage in RFQs (usageCount field, trackSwapUsage function)
- [x] Material swap service (calculateSwapScore, findSwapCandidates, saveSwapRecommendation, getSavedSwaps)
- [x] Material swap tRPC procedures (findCandidates, getSavedSwaps, saveSwap, calculateScore)
- [x] Material swap intelligence unit tests (15 tests passing)
- [ ] Swap recommendations UI on Material Detail page (Good/Better/Best ranking)
- [ ] Full EPD breakdown on Material Detail page (embodied carbon, GWP, lifecycle stages)
- [ ] Compliance grades display (fire rating, building code compliance)
- [ ] LEED credit contributions display
- [ ] Agent integration for swap suggestions (Material Intelligence Agent tool)


## ChainBot Material Swap Integration

- [x] Review existing ChainBot agent architecture and tool registry
- [x] Create suggest_material_swaps tool function (checks saved swaps first, then calculates on-the-fly)
- [x] Add tool schema definition with material ID and limit parameters
- [x] Integrate tool into ChainBot's available tools list (MATERIAL_TOOLS array)
- [x] Update ChainBot system prompt to mention swap recommendation capability
- [x] Add tool dispatch case in executeToolCall switch
- [x] Write unit tests for suggest_material_swaps tool (3 tests passing)
- [x] Verify tool returns Good/Better/Best tier recommendations with scores, confidence, and business data


## Proactive ChainBot Suggestions

- [x] Define high-carbon material threshold (>50 kgCO2e/1000SF = high, 30-50 = moderate, <30 = low)
- [x] Add proactive suggestion logic to ChainBot system prompt
- [x] Detect when user views material (materialId in context triggers get_material_detail)
- [x] Auto-trigger suggest_material_swaps when threshold exceeded
- [x] Format proactive message with business-focused contextual prompt (LEED impact, liability, compliance)
- [x] Test proactive suggestions with high-carbon materials (3 tests covering high/moderate/low carbon)
- [x] Write unit tests for proactive suggestion triggers (all 125 tests passing)
- [ ] Add UI indicator for proactive suggestions (icon, badge, or highlight) - Future enhancement


## Material Swap UI Cards

- [x] Locate Material Detail page component (MaterialDetail.tsx)
- [x] Create MaterialSwapCard component with tier badges (Good/Better/Best with distinct colors and icons)
- [x] Add side-by-side comparison layout (2-column grid on desktop)
- [x] Display carbon savings (kgCO2e/1000SF and percentage with visual indicators)
- [x] Show price comparison (delta percentage with up/down arrows)
- [x] Add confidence indicator (percentage with visual progress bar)
- [x] Display swap score (0-100 in badge)
- [x] Add swap reason/explanation text (italic border-left quote style)
- [x] Integrate tRPC materialSwaps.getSavedSwaps query
- [x] Add loading and empty states (skeleton + sparkles icon)
- [x] Add "Sustainable Swaps" tab to Material Detail page
- [x] Test Material Swap UI on Material Detail page (all 125 tests passing)


## Supplier Portal Registration

- [x] Review supplier and supplier_subscriptions schema
- [x] Create supplier registration tRPC procedures (register, getProfile, updateProfile)
- [x] Create subscription tier tRPC procedures (getSubscriptionTier, upgradeToPremium, downgradeToFree)
- [x] Create supplier service with all CRUD operations
- [x] Write comprehensive tests for supplier registration and profile management (15 tests)
- [ ] Build supplier registration page (email, company name, location, materials)
- [ ] Build subscription tier selection page (Free vs Premium with features comparison)
- [ ] Build supplier profile management page (edit company info, materials, certifications)
- [ ] Add supplier dashboard link to header navigation
- [ ] Run database migrations to create suppliers table


## Supplier Registration Page

- [x] Create SupplierRegistration multi-step form component (504 lines)
- [x] Step 1: Company Information (name, email, phone, website)
- [x] Step 2: Location (address, city, state, zipCode, country)
- [x] Step 3: Materials (12 material types, 6 certifications)
- [x] Step 4: Subscription Tier (Free vs Premium comparison with features)
- [x] Form validation and error handling
- [x] Integrate supplier.register tRPC mutation
- [x] Success confirmation page with auto-login
- [x] Add route to App.tsx (/supplier/register)
- [x] Add "Become a Supplier" link to header navigation
- [x] Progress indicator with step tracking
- [x] Responsive design with gradient background


## Supplier Profile Dashboard

- [x] Create SupplierProfileDashboard component with tabs (544 lines)
- [x] Tab 1: Company Information (edit form with validation)
- [x] Tab 2: Logo Upload (file preview and upload)
- [x] Tab 3: Materials & Certifications (12 materials, 6 certifications)
- [x] Tab 4: Subscription & Billing (tier display, upgrade button, expiration date)
- [x] Integrate supplier.getProfile tRPC query
- [x] Integrate supplier.updateProfile tRPC mutation
- [x] Add logo upload file input with preview
- [x] Add route to App.tsx (/supplier/dashboard)
- [x] Add loading state with spinner
- [x] Add responsive grid layout with gradient background
- [ ] Implement S3 logo upload with storagePut helper
- [ ] Add link to supplier dashboard from header (when logged in as supplier)


## Supplier RFQ & Bid Management

- [x] Create tRPC procedures for supplier RFQ queries (getAvailableRfqs, getRfqDetails)
- [x] Create tRPC procedures for bid management (submitBid, getBidHistory, getBid, updateBid)
- [x] Create supplier-rfq-router.ts with 5 procedures
- [x] Add supplierRfq router to appRouter in routers.ts
- [x] Create BidSubmissionForm component (pricing, lead time, notes) with full validation
- [x] Add form validation (bid price, lead days, notes length)
- [x] Integrate tRPC submitBid and updateBid mutations
- [x] Add loading states, error handling, and success feedback
- [x] Write comprehensive tests for BidSubmissionForm (35 tests passing)
- [ ] Build SupplierRfqDashboard page with RFQ list and filtering
- [ ] Add RFQ list with status badges (Open, Bidding, Awarded, Closed)
- [ ] Add RFQ detail modal with materials, quantities, and buyer info
- [ ] Add bid history view (submitted bids, status, pricing)
- [ ] Integrate real-time bid status updates
- [ ] Add notifications for new RFQs and bid responses


## Paywall Middleware & Subscription Management

- [x] Review existing subscription schema (supplier_subscriptions, buyer_subscriptions)
- [x] Update schema to use Microsoft marketplace fields (msSubscriptionId, msPlanId)
- [x] Add usage_tracking table for metered billing dimensions (userId, supplierId, dimension, quantity)
- [x] Build subscription service (getBuyerSubscription, createBuyerSubscription, upgradeBuyerSubscription, cancelBuyerSubscription)
- [x] Build tier-based middleware (checkBuyerFeatureAccess, checkSupplierFeatureAccess, getBuyerTierLimits, getSupplierTierLimits)
- [x] Define TIER_LIMITS with feature gates and usage limits for all tiers
- [x] Create usage tracking service (trackBuyerUsage, trackSupplierUsage, getBuyerUsage, getSupplierUsage, checkUsageLimit)
- [x] Add tRPC procedures for subscription management (getBuyerSubscription, upgradeBuyerSubscription, getBuyerTierLimits, checkBuyerFeatureAccess)
- [x] Add tRPC procedures for usage tracking (getBuyerUsage, getSupplierUsage, checkUsageLimit, trackBuyerUsage, trackSupplierUsage)
- [x] Build UsageCounter component with progress bars and upgrade CTAs
- [x] Build UpgradeModal component with tier comparison (Free/Standard/Premium)
- [x] Build PaywallGate wrapper component (soft/hard modes)
- [x] Build usePaywallCheck hook for programmatic checks
- [ ] Write tests for subscription service and usage tracking
- [x] Integrate paywall into RFQ submission (5/mo Standard limit)
- [x] Integrate paywall into ChainBot AI queries (25/mo Standard limit)
- [x] Integrate paywall into Material Swap analysis (20/mo Standard limit)
- [ ] Integrate paywall into CCPS exports (10/mo Standard limit) - TODO: Add export buttons
- [x] Integrate paywall into Material Comparison (50 vs unlimited)


## Microsoft SaaS Accelerator Integration

- [x] Create landing page endpoint (/api/marketplace/landing) for subscription activation
- [x] Create webhook endpoint (/api/marketplace/webhook) for lifecycle events (purchased, suspended, canceled, renewed)
- [x] Implement Azure AD token validation for Microsoft Marketplace requests
- [x] Implement Microsoft Metering API integration to report usage
- [x] Add environment variables for Azure AD (AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET)
- [x] Document Partner Center configuration (Landing Page URL, Webhook URL, Connection Webhook URL)
- [ ] Test subscription activation flow (requires Partner Center setup)
- [ ] Test webhook event handling (requires Partner Center setup)
- [ ] Test metering API reporting (requires Partner Center setup)


## Real-Time Notification System

- [ ] Create notification tRPC procedures (getUnreadCount, getNotifications, markAsRead, markAllAsRead)
- [ ] Integrate Azure Web PubSub for real-time notification delivery
- [ ] Create NotificationBadge component with unread count
- [ ] Create NotificationCenter component with notification list
- [ ] Create toast notification system for real-time alerts
- [ ] Integrate notifications into RFQ submission flow (notify matched suppliers)
- [ ] Add notification icon to header with badge count
- [ ] Test real-time notification delivery
- [ ] Write unit tests for notification system


## Deployment Issues

- [x] Fix pnpm dependency resolution error (zod version conflict)
- [ ] Test Docker build locally
- [ ] Verify deployment succeeds
