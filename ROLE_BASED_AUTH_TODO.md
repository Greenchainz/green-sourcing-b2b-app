# Role-Based Authentication TODO

## Phase 1: Role Selection & Signup Flows
- [ ] Create `/signup/role-select` page with "I'm a Buyer" and "I'm a Supplier" buttons
- [ ] Create `/signup/buyer` page for buyer-specific signup
- [ ] Create `/signup/supplier` page for supplier-specific signup
- [ ] Create `/signup/admin` page for admin signup (invite-only)
- [ ] Update database schema to include `role` field (`buyer` | `supplier` | `admin`)

## Phase 2: Separate Dashboards
- [x] Build `/dashboard/buyer` - Marketplace view for architects/contractors (ALREADY EXISTS)
- [x] Build `/dashboard/supplier` - Supplier control panel for managing listings (ALREADY EXISTS)
- [ ] Build `/dashboard/admin` - Admin control panel for platform management
- [ ] Create admin dashboard components (user management, analytics, moderation)

## Phase 3: Role-Based Redirect Logic
- [ ] Update auth.ts to store user role in session
- [ ] Create middleware to check user role after login
- [ ] Redirect buyers to `/dashboard/buyer` after login
- [ ] Redirect suppliers to `/dashboard/supplier` after login
- [ ] Redirect admins to `/dashboard/admin` after login
- [ ] Add role check to prevent unauthorized access to dashboards

## Phase 4: Testing & Deployment
- [ ] Test buyer signup flow
- [ ] Test supplier signup flow
- [ ] Test role-based redirects
- [ ] Test dashboard access controls
- [ ] Push changes to GitHub
