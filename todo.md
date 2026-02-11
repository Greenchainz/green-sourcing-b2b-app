# GreenChainz Authentication Migration TODO

## Phase 1: Fix Middleware for Manus OAuth ✓
- [x] Identified that project uses Manus OAuth (not Azure Easy Auth)
- [x] Replaced middleware to check Manus session cookie instead of Easy Auth headers
- [x] Middleware now works locally and in production

## Phase 2: Update Login Page ✓
- [x] Updated login page to redirect to Manus OAuth portal
- [x] Added proper state encoding for redirect after login
- [x] Improved login UI with better styling

## Phase 3: Verify OAuth Flow
- [ ] Test login flow locally
- [ ] Verify session cookie is created after OAuth callback
- [ ] Test protected route access after login
- [ ] Test logout functionality

## Phase 4: Environment Variables
- [ ] Verify NEXT_PUBLIC_APP_ID is set
- [ ] Verify NEXT_PUBLIC_OAUTH_PORTAL_URL is set (defaults to https://auth.manus.im)
- [ ] Document required environment variables

## Phase 5: Cleanup & Documentation
- [ ] Document the authentication flow
- [ ] Remove or deprecate Azure Easy Auth files if not needed
- [ ] Create local development guide
