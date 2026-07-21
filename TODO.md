# Readers2026 - Upgrade Plan Tracking

## Phase 1: Hardening foundation (no breaking changes)
- [ ] Create storage repository abstraction layer (keep JSON DB implementation)
- [ ] Add moderation flags to models (approvalStatus fields) with defaults set to `approved` for existing seeded data
- [ ] Add basic security middleware: CSRF protection, rate limiting hooks, upload validation hooks
- [ ] Add XSS sanitization for comment/reply content paths
- [ ] Update controllers to write/read approvalStatus without altering current UI flow
- [ ] Ensure all existing pages still render with approved content


## Phase 2: Admin approval queues + public gating
- [ ] Update public routes to filter out non-approved items (novels/authors)
- [ ] Extend admin UI to show pending novels/authors queues
- [ ] Add admin approve/reject endpoints for novels/authors
- [ ] Update submission creation to set `pending` instead of immediately public (admin-managed actions keep working)
- [ ] Verify admin dashboard metrics and moderation queue still work

## Phase 3: Auth verification + reset + remember-me
- [ ] Implement email verification token flow and gating for protected features
- [ ] Implement forgot/reset password token flow
- [ ] Implement remember-me token and session restoration

## Phase 4: M-Pesa payment gating for submissions
- [ ] Add Submission + Payment models
- [ ] Implement STK push + callback endpoint
- [ ] Gate content moderation on payment success

## Phase 5+: Social, author directory sync, PWA/SEO, favicon, UI polish
- [ ] Expand social models/endpoints (reactions, following, notifications)
- [ ] Author sync from Wikidata/Wikipedia/Open Library/Gutenberg
- [ ] PWA setup, sitemap/robots/structured data
- [ ] Premium favicon generation and icon pipeline

