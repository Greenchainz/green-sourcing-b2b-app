# GreenChainz B2B App - TODO

## Core Platform

- [x] Authentication system (Manus OAuth)
- [x] Dev server running
- [x] Branded landing page with hero, tools section, CTA
- [x] Header navigation (About, Materials, Assemblies, RFQ, Compare)
- [x] Footer with product/company/legal links and social icons
- [x] About page with company story
- [x] Intercom chat widget integrated (cqtm1euj)

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

- [ ] API endpoints accessible by Azure AI agents
- [ ] Material search API for agent queries
- [ ] CCPS calculation API for agent use
- [ ] RFQ creation API for agent-initiated quotes

## Future Enhancements

- [ ] Supplier Portal (dashboard, RFQ responses, product management)
- [ ] Admin Dashboard (user management, verification queue)
- [ ] Real-time notifications
- [ ] Mobile responsiveness improvements
- [ ] EPD data scraper integration (EC3, Building Transparency, Autodesk SDA)
- [ ] Pricing API integration (RS Means, Dodge)
