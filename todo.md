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


## Navigation Issues

- [x] Create GetStarted page with role selection (Buyer vs Supplier)
- [x] Implement role-based login flow (redirect to appropriate dashboard after auth)
- [x] Add anonymous browsing toast for materials catalog ("Login to get personalized recommendations")
- [x] Add /get-started route to App.tsx


## Navigation Fixes

- [x] Fix "See How It Works" button 404 error (redirects to /about page)


## Login/Signup Flow

- [x] Review existing Manus OAuth implementation
- [x] Implement role assignment after OAuth callback (buyer vs supplier)
- [x] Create post-login redirection logic based on user role
- [x] Update database schema to support buyer and supplier roles
- [x] Test complete login flow for both buyer and supplier roles
- [x] Document test results in LOGIN_FLOW_TEST_RESULTS.md
- [ ] Handle first-time user onboarding (profile completion) - Future enhancement


## Notification UI Components

- [x] Create NotificationBadge component with unread count indicator
- [x] Create NotificationCenter dropdown component with notification list
- [x] Integrate WebPubSub for real-time notification delivery
- [x] Add toast notifications for new alerts (using sonner)
- [x] Add notification badge to header navigation
- [ ] Test real-time notification updates (requires RFQ submission integration)
- [ ] Write unit tests for notification components


## RFQ Notification Integration

- [x] Implement supplier matching logic (find suppliers based on RFQ materials)
- [x] Add notification sending to RFQ submission flow
- [x] Send real-time notifications via WebPubSub to matched suppliers
- [ ] Test RFQ notification delivery end-to-end (requires test data)
- [ ] Add email notifications for suppliers (optional enhancement)


## Email Notification System

- [x] Create email service with HTML template support
- [x] Design email templates for RFQ notifications
- [x] Add email sending to RFQ notification flow
- [ ] Implement notification preferences table in database (future enhancement)
- [ ] Add supplier notification preferences UI (future enhancement)
- [ ] Test email delivery for critical events (requires SMTP configuration)


## Supplier RFQ Dashboard

- [x] Create SupplierRfqDashboard page component
- [x] Add tRPC procedure to fetch matched RFQs for supplier (getMatchedRfqs)
- [x] Build RFQ list table with sortable columns (match score, date, status)
- [x] Add status filter (All, New, Active, Closed)
- [x] Add sort controls (Match Score, Date Posted, Due Date)
- [x] Display match score with visual indicator (progress bar)
- [x] Add quick actions (View Details, Submit Bid)
- [ ] Create RFQ detail modal/panel (uses existing /rfq/:id page)
- [x] Integrate with bid submission flow (links to existing bid form)
- [x] Add route to App.tsx (/supplier/rfqs)


## Enhanced Match Score Algorithm

- [x] Add certifications field to suppliers table (JSON array: ISO, LEED, FSC, etc.)
- [x] Add requiredCertifications field to rfqs table
- [x] Update calculateMatchScore to include certification matching (+15 points)
- [x] Add capacity fields to suppliers table (maxOrderValue, currentCapacity)
- [x] Implement capacity factor calculation (+10 points)
- [x] Add materialTypePreferences to supplier_filters table
- [x] Implement material type preference matching (+15 points)
- [x] Rebalance scoring weights (total still 100 points)
- [x] Document algorithm in MATCH_SCORE_ALGORITHM.md
- [ ] Update SupplierRfqDashboard to show certification badges (future enhancement)
- [ ] Write unit tests for enhanced match score algorithm


## Certification Badges on Supplier Dashboard

- [x] Update getSupplierMatchedRfqs to return matched certifications
- [x] Create CertificationBadge component with green checkmark for matched, gray for missing
- [x] Add tooltip to show full certification names
- [x] Integrate badges into SupplierRfqDashboard RFQ cards
- [ ] Test certification badge display with sample data (requires test RFQs with certifications)


## Azure Maps Distance Calculation

- [x] Create Azure Maps service module with geocoding and distance matrix API
- [ ] Add AZURE_MAPS_SUBSCRIPTION_KEY environment variable (requires user configuration)
- [x] Add latitude/longitude fields to suppliers table
- [x] Add latitude/longitude fields to rfqs table
- [x] Implement geocoding for supplier locations (cache coordinates)
- [x] Implement geocoding for RFQ project locations (cache coordinates)
- [x] Update calculateMatchScore to use distance-based scoring instead of binary location match
- [x] Add distance field to getSupplierMatchedRfqs response
- [x] Add distance filter to SupplierRfqDashboard UI (25/50/100/250/500 miles radius)
- [x] Add distance display on RFQ cards
- [x] Add "Sort by Distance" option
- [ ] Test distance calculation with real addresses (requires Azure Maps API key)


## Map Visualization for Supplier Dashboard

- [x] Create RfqMapView component with Azure Maps SDK integration
- [x] Add supplier location marker with custom icon (blue pin)
- [x] Add RFQ origin marker with different icon (red pin)
- [x] Display distance labels on markers
- [x] Implement radius circle overlay for distance filter
- [x] Add click handlers for marker interactions
- [x] Integrate map view into SupplierRfqDashboard layout
- [x] Add map/list toggle for dashboard view
- [x] Add supplier coordinates to getSupplierMatchedRfqs response
- [ ] Test map rendering with real RFQ data (requires test data with geocoded addresses)


## Azure Maps Routing Integration

- [x] Add calculateRoute function to azure-maps-service.ts (Route API integration)
- [x] Drive time calculation via Azure Maps Distance Matrix API (already in calculateDistance)
- [x] Update getSupplierMatchedRfqs to include drive time in response
- [x] Add driveTimeMinutes field to RFQ cards in SupplierRfqDashboard
- [x] Add getRoute tRPC procedure for route polyline data
- [ ] Create RouteVisualization component with polyline overlay (future enhancement)
- [ ] Add "Show Route" button to RFQ cards (future enhancement)
- [ ] Implement multi-stop route optimization (future enhancement - requires TSP solver)
- [ ] Add route details panel with turn-by-turn directions (future enhancement)
- [ ] Test routing with real addresses (requires geocoded test data)


## Bug Fixes

- [x] Fix TypeScript error in NotificationCenter.tsx - replaced getAll with getUnread
- [x] Fix TypeScript error in useNotifications hook - replaced getAll with getUnread


## Real-Time Messaging System

- [ ] Create conversations table (id, rfqId, buyerId, supplierId, createdAt, updatedAt)
- [ ] Create messages table (id, conversationId, senderId, content, createdAt, isRead)
- [ ] Add database migration for messaging tables
- [ ] Create messaging-service.ts with CRUD operations
- [ ] Add messaging tRPC router (getConversations, getMessages, sendMessage, markAsRead)
- [ ] Create ConversationList component (sidebar with conversation threads)
- [ ] Create MessageThread component (message list with sender bubbles)
- [ ] Create MessageInput component (text input with send button)
- [ ] Create ChatPanel component (combines all chat UI)
- [ ] Integrate Azure Web PubSub for real-time message delivery
- [ ] Add "Message Supplier" button to RFQ detail page
- [ ] Add "Message Buyer" button to supplier RFQ dashboard
- [ ] Test real-time messaging between buyer and supplier accounts


## Direct Company Messaging with Paywall

- [x] Make rfqId optional in conversations table schema
- [x] Update messaging service to support direct company messaging (no RFQ required)
- [ ] Add "Message Company" buttons on supplier profile pages
- [x] Implement message count tracking in usage_tracking table
- [x] Create PaywallGate for message sending with tier checks
- [x] Free tier: 1 response per conversation limit
- [x] Standard tier: Limited messages per month (50 messages)
- [x] Premium tier: Unlimited messages
- [x] Block message sending when limit reached with upgrade prompt
- [x] Allow buyers unlimited messaging (no paywall)
- [x] Update MessageInput component with PaywallGate integration
- [ ] Test messaging paywall with all three tiers

## Video Calling Integration (Dual System)

- [x] WebRTC video service for Standard tier (peer-to-peer, 10hr/month)
- [x] Azure Communication Services integration for Premium tier (enterprise, 50hr/month)
- [x] Track video call duration per user in usage_tracking table
- [x] Free tier: No video calling access
- [x] Standard tier: 10 hours WebRTC video per month
- [x] Premium tier: 50 hours Azure ACS video per month (HD, recording, group calls)
- [x] Build tier-aware VideoCallButton component
- [ ] Build WebRTCVideoCall component for Standard tier (full UI with peer connection)
- [ ] Build ACSVideoCall component for Premium tier (full UI with ACS SDK)
- [x] Smart video router that selects system based on user tier
- [x] Display remaining video hours and current tier in UI
- [x] Block video call initiation when limit reached
- [x] Show upgrade prompt: Standard→Premium for enterprise features
- [ ] Test both video systems with all three tiers


## Microsoft AppSource Subscription Integration

- [x] Create subscription management service (microsoft-subscription-service.ts)
- [x] Add subscription webhook handler for lifecycle events (activated, renewed, cancelled, suspended)
- [x] Create subscriptions table in database (id, userId, microsoftSubscriptionId, tier, status, startDate, endDate)
- [x] Integrate tier checking into existing paywall logic (messaging, video calling)
- [x] Add subscription status to user profile
- [x] Build subscription management UI (view status, upgrade, cancel)
- [x] Build admin panel for subscription management (view all subscriptions, manual tier changes)
- [ ] Add Microsoft Marketplace API client (fulfillment API, metering API) - Future enhancement
- [ ] Test subscription activation flow (requires Microsoft credentials)
- [ ] Test subscription renewal flow (requires Microsoft credentials)
- [ ] Test subscription cancellation flow (requires Microsoft credentials)
- [ ] Test tier upgrade/downgrade flows (requires Microsoft credentials)
- [ ] Write unit tests for subscription service
- [ ] Document Microsoft Partner Center setup steps


## WebRTC Video Call UI (Complete Implementation)

- [x] Build WebRTCVideoCall component with peer connection setup
- [x] Implement local and remote video stream rendering
- [x] Add camera on/off toggle with visual feedback
- [x] Add microphone mute/unmute toggle with visual feedback
- [x] Build call duration timer (minutes:seconds format)
- [x] Add hang-up button with confirmation
- [x] Implement call initiation flow (offer/answer/ICE candidates)
- [x] Handle incoming call acceptance
- [x] Add connection status indicator (connecting, connected, disconnected)
- [x] Implement automatic call cleanup on disconnect
- [x] Track call duration and report to backend for paywall enforcement
- [x] Add error handling for camera/mic permissions
- [ ] Test peer-to-peer video call between two users (requires two logged-in users)
- [ ] Test call controls (mute, camera off, hang up) (requires active call)
- [ ] Test duration tracking and paywall limit enforcement (requires active call)


## Incoming Call Notification UI

- [x] Build IncomingCallNotification modal component
- [x] Add accept/decline buttons with visual feedback
- [x] Display caller name and avatar
- [x] Add ringing animation (bouncing dots)
- [x] Integrate WebSocket listener for incoming call events (useWebPubSub hook)
- [x] Handle accept action (open WebRTCVideoCall component)
- [x] Handle decline action (send rejection to caller)
- [x] Auto-dismiss notification after timeout (30 seconds)
- [x] Show notification in all pages (global component in App.tsx)
- [ ] Test incoming call notification flow (requires two logged-in users)


## RFQ Messaging Integration

- [x] Auto-create conversations when RFQ is submitted (buyer + all matched suppliers)
- [x] Auto-create conversation when bid is placed (buyer + specific supplier)
- [x] Add "Message Supplier" button to buyer RFQ dashboard
- [x] Add "Message Buyer" button to Supplier RFQ Dashboard
- [x] Add conversation context (RFQ ID) to message threads
- [x] Test end-to-end messaging flow (buyer → supplier via RFQ)

## Voice & Video Calling (Azure Communication Services)

- [ ] Set up Azure Communication Services resource in Azure Portal
- [ ] Add ACS connection string to environment variables
- [ ] Create ACS service module (token generation, call management)
- [ ] Build CallButton component with tier-based access control (Premium/Standard only)
- [ ] Build IncomingCallModal component with accept/decline UI
- [ ] Build ActiveCallUI component with mute, video toggle, hang up controls
- [ ] Add call duration tracking and tier limit enforcement
- [ ] Integrate calling into RFQ messaging threads
- [ ] Add "Call Supplier" button to RFQ detail page (Premium/Standard buyers only)
- [ ] Add "Call Buyer" button to Supplier RFQ Dashboard (Premium suppliers only)
- [ ] Test voice calling end-to-end
- [ ] Test video calling end-to-end
- [ ] Add call history tracking in database


## Unified Messaging Widget (Intercom-Style)

- [x] Update database schema: agent_handoff_rules table (supplierId, handoffMode, maxAgentMessages, businessHours, customPrompt)
- [x] Update conversations table: add agentMode, handoffStatus, messageCount fields
- [x] Create UnifiedChatWidget component (floating bubble, bottom-right corner)
- [x] Build ChatWidgetHeader with agent badges and status indicators
- [x] Build ChatWidgetBody with unified conversation thread
- [x] Build ChatWidgetInput with typing indicators and file upload
- [x] Add agent triage system (Otto routes to Material/RFQ/Supplier agents)
- [x] Implement intelligent routing based on user intent and context
- [x] Add human handoff logic (configurable threshold, escalation rules)
- [x] Build "Request Human" button in chat widget
- [ ] Create supplier agent configuration dashboard (Premium only)
- [ ] Add handoff mode selector (Always Agent, Hybrid, Immediate Human)
- [ ] Add max agent messages before handoff setting
- [ ] Add business hours configuration for human availability
- [ ] Add custom agent prompt editor for supplier branding
- [ ] Display agent conversation analytics (resolution rate, handoff rate, avg messages)
- [ ] Wire widget into RFQ detail pages
- [ ] Add widget to material detail pages
- [ ] Add widget to supplier profile pages
- [ ] Test agent routing with all conversation types
- [ ] Test human handoff with different supplier configurations


## Chat Widget State Management

- [x] Create ChatWidgetContext for global state (isOpen, selectedConversationId, openWithConversation method)
- [x] Wrap App.tsx with ChatWidgetProvider
- [x] Update UnifiedChatWidget to consume ChatWidgetContext
- [x] Add openConversation method that finds/creates conversation and opens widget
- [x] Wire buyer dashboard "Message Supplier" button to context method
- [x] Wire supplier dashboard "Message Buyer" button to context method
- [x] Test: Click "Message" button → Widget opens → Correct conversation selected


## New Conversation Feature

- [x] Add "New Conversation" button to UnifiedChatWidget header
- [x] Create SupplierSearchModal component with search/filter functionality
- [x] Add tRPC procedure: createDirectConversation(supplierId) → creates conversation with rfqId=null
- [x] Update conversation list to show both RFQ-linked and direct conversations
- [x] Add visual badges: "RFQ: Project Name" vs "Direct Inquiry"
- [x] Test: Click "New Conversation" → Search supplier → Select → Conversation created → Widget shows it


## Unread Message Badge

- [ ] Add unread count badge to floating chat bubble (when widget is closed)
- [ ] Badge shows number of unread messages with red background
- [ ] Badge positioned at top-right corner of chat icon
- [ ] Test: Receive message → Badge appears with count → Open widget → Badge disappears


## Conversation Filters

- [x] Add filter dropdown above conversation list (All/RFQ Only/Direct Only/Agent/Human)
- [x] Filter conversations based on selected filter type
- [x] Persist filter selection in component state
- [x] Test: Select "RFQ Only" → Only RFQ conversations shown

## Direct Conversation Notifications

- [x] Add notification creation in createDirectConversation mutation
- [x] Send in-app notification to supplier when buyer starts direct conversation
- [x] Send email notification to supplier (optional, based on supplier preferences)
- [x] Include buyer name and conversation link in notification
- [x] Test: Create direct conversation → Supplier receives notification

## Recent Suppliers Section

- [x] Add "Recently Contacted" section to SupplierSearchModal
- [x] Query conversations to get unique supplier IDs user has messaged
- [x] Display recent suppliers at top of modal (before search results)
- [x] Limit to 5 most recent suppliers
- [x] Test: Message supplier → Close modal → Reopen → Supplier appears in "Recent" section


## eBay-Style Messaging Features

### Message Previews & Timestamps
- [x] Add lastMessage and lastMessageTime to conversations query
- [x] Display message preview (first 50 chars) under conversation name
- [x] Add relative timestamps ("Just now", "5 min ago", "Yesterday 3:45 PM")
- [x] Update conversation list to show preview + timestamp

### Conversation Sorting
- [x] Add sort dropdown (Newest First / Oldest First / Unread First)
- [x] Sort conversations based on selected option
- [x] Persist sort preference in component state

### Typing Indicators
- [ ] Add typing status to messages table or use WebPubSub events
- [ ] Broadcast typing events via WebPubSub when user types
- [ ] Display "Supplier is typing..." indicator in chat
- [ ] Auto-clear typing indicator after 3 seconds of inactivity

### Read Receipts
- [x] Add readAt timestamp to messages table
- [x] Update message as read when recipient views it
- [x] Display "Seen" status with timestamp under sent messages
- [x] Show double checkmark (✓✓) for read messages

### Attachment Support
- [x] Add attachmentUrl and attachmentType to messages table
- [x] Add file upload button to message input
- [x] Upload files to S3 via storagePut
- [x] Display image previews inline, PDFs as download links
- [x] Support image, PDF, document attachments

### Quick Replies
- [ ] Add quick reply buttons above message input
- [ ] Pre-defined responses: "Thanks!", "Interested", "Need more info", "Can you send specs?"
- [ ] Click quick reply → auto-fills message input

### Message Reactions
- [x] Add reactions table (messageId, userId, reactionType)
- [x] Add reaction picker (👍 👎 ❤️ 🎉 ✅) on message hover
- [x] Display reactions under messages with count
- [x] Allow users to add/remove reactions

### Conversation Actions
- [ ] Add "Mark as Unread" button to conversation header
- [x] Add "Archive" button to hide completed conversations
- [x] Add "Pin Conversation" to keep important threads at top
- [x] Show archived conversations in separate tab/filter

### Conversation Labels/Tags
- [ ] Add conversationLabels table (conversationId, label, color)
- [ ] Add label dropdown: "Urgent", "Follow-up", "Negotiating", "Closed"
- [ ] Display label badges on conversation cards
- [ ] Filter conversations by label

### Bulk Actions
- [ ] Add checkbox selection to conversation list
- [ ] Add bulk action bar: "Mark all as read", "Archive selected", "Delete selected"
- [ ] Execute bulk operations on selected conversations

### Message Search
- [ ] Add search input in widget header
- [ ] Search messages by content, sender name, or RFQ title
- [ ] Highlight search results in conversation list
- [ ] Jump to message in thread when clicked

### RFQ/Bid Inline Cards
- [ ] Detect RFQ/bid references in messages
- [ ] Display rich cards with RFQ details (title, budget, deadline)
- [ ] Show bid details (price, delivery time, status)
- [ ] Add "View RFQ" / "View Bid" buttons in cards


## Voice/Video Calling Integration

### Database Schema
- [x] Add call_history table (id, conversationId, callerId, receiverId, callType, startTime, endTime, duration, status)
- [x] Add monthly_call_usage table (userId, month, totalMinutes)
- [x] Add supplier tier limits to subscription tiers (Free: 0, Standard: 30, Premium: unlimited)

### Backend Implementation
- [x] Create calling-service.ts with tier-based limit checking
- [x] Add initiateCall tRPC procedure (checks tier limits before allowing call)
- [x] Add endCall procedure (calculates duration, updates usage)
- [x] Add checkCallLimit procedure (returns remaining minutes for current month)
- [x] Add call notification system (notify receiver when call incoming via WebPubSub)

### Frontend UI
- [x] Add Voice/Video call buttons to conversation header
- [x] Check supplier tier before showing call buttons
- [x] Show remaining minutes badge for Standard tier users
- [x] Build CallModal component (video feed, controls, duration timer)
- [x] Add incoming call notification/modal
- [ ] Display "Call in progress" status in conversation
- [ ] Handle call rejection, missed calls, busy status

### Call Flow
- [ ] Caller clicks Voice/Video button → Check tier limit → Generate ACS tokens
- [ ] Notify receiver via WebPubSub → Receiver accepts/rejects
- [ ] Establish ACS call → Show CallModal with video/audio
- [ ] Track duration in real-time → Update usage on hang-up
- [ ] Save call history record with duration and status
