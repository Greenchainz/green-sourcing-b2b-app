# GreenChainz B2B App - Frontend Development TODO

**Last Updated:** February 11, 2026  
**Architecture:** Frontend (Manus webdev) → Backend API (Azure Container Apps)  
**Backend URL:** https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io

---

## ✅ COMPLETED

- [x] Authentication system (Manus OAuth working)
- [x] Backend deployed to Azure Container Apps (greenchainz-container)
- [x] PostgreSQL database with 30+ tables (786 lines SQL)
- [x] Azure integration layer (Blob Storage, OpenAI, Document Intelligence, Key Vault)
- [x] AI agent library (5 agents in backend)
- [x] Backend landing page (visible at backend URL)
- [x] Dev server running without errors

---

## 🚧 IN PROGRESS

### Phase 1: API Client & Backend Integration (Current Priority)
- [x] Document backend API endpoints (check /api routes)
- [x] Create API client library (client/src/lib/api-client.ts)
- [x] Set up fetch with backend base URL
- [ ] Test authentication flow with backend
- [x] Create TypeScript types for API responses
- [x] Add error handling and retry logic

### Phase 2: Buyer Dashboard
- [ ] Build dashboard layout with navigation
- [ ] Display active RFQs from backend API
- [ ] Show recent orders
- [ ] Display saved suppliers
- [ ] Add project settings panel
- [ ] Wire all data to real backend endpoints

### Phase 3: RFQ Creation Flow
- [ ] Build multi-step RFQ form (project details, material specs, supplier selection)
- [ ] Connect form submission to backend POST /api/rfqs
- [ ] Display RFQ preview before submission
- [ ] Show submission confirmation
- [ ] List user's RFQs with status tracking
- [ ] Add RFQ detail view with responses

### Phase 4: Material Catalog
- [ ] Build material search with filters (category, certifications, carbon score)
- [ ] Display material cards with sustainability scores
- [ ] Show certification badges (EPD, HPD, FSC, C2C, GREENGUARD)
- [ ] Add material comparison feature
- [ ] Connect to backend /api/materials endpoint
- [ ] Implement pagination and sorting

### Phase 5: Supplier Portal
- [ ] Build supplier dashboard
- [ ] Display incoming RFQs
- [ ] Create RFQ response form
- [ ] Build product management (add/edit/delete products)
- [ ] Add certification upload
- [ ] Show supplier analytics (RFQ views, response rate)

### Phase 6: Admin Dashboard
- [ ] Build admin user management
- [ ] Create supplier verification queue
- [ ] Add product moderation interface
- [ ] Display platform analytics
- [ ] Build subscription management UI

### Phase 7: Branding & Design
- [ ] Extract color scheme from backend landing page (mint green #A8D5A2)
- [ ] Apply GreenChainz logo consistently
- [ ] Style all pages to match backend design
- [ ] Add navigation menu (About, Blog, Careers, Contact, etc.)
- [ ] Create footer with links and social icons
- [ ] Ensure responsive design on mobile

### Phase 8: Testing
- [ ] Test authentication flow
- [ ] Test RFQ creation end-to-end
- [ ] Test material search and filtering
- [ ] Test supplier RFQ response flow
- [ ] Test admin verification workflows
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness testing

### Phase 9: Deployment
- [ ] Create checkpoint in Manus
- [ ] Deploy frontend to production
- [ ] Verify frontend can reach backend in production
- [ ] Test CORS configuration
- [ ] Smoke test all critical flows
- [ ] Monitor for errors

---

## 🔮 FUTURE ENHANCEMENTS (Post-MVP)

- [ ] Real-time notifications (Intercom integration)
- [ ] Email notifications (Resend integration)
- [ ] Advanced analytics dashboards
- [ ] Mobile app (React Native)
- [ ] Revit plugin UI improvements
- [ ] Excel add-in enhancements
- [ ] Chrome extension updates
- [ ] Multi-language support

---

## 📝 ARCHITECTURE NOTES

**Frontend (This Project):**
- Next.js 14 + React 19 + Tailwind CSS 4
- Manus OAuth for authentication
- API client calls to backend container
- Hosted on Manus platform

**Backend (Separate Container):**
- Azure Container Apps (greenchainz-container)
- PostgreSQL database with Managed Identity
- AI agents (Azure OpenAI)
- Document Intelligence
- Blob Storage
- All business logic and data access

**Integration:**
- Frontend makes HTTP requests to backend API
- Backend handles all database queries
- Backend runs AI agents
- Backend manages file storage
- Frontend is purely presentational + API calls

### Phase 7: Branding & Design
- [x] Update color palette in index.css with mint green #A8D5A2
- [x] Create branded navigation header with GreenChainz logo
- [x] Redesign home page to match backend landing page style
- [x] Add footer with company links and social icons
- [x] Ensure responsive design on mobile
- [x] Create AuthContext for user authentication state
