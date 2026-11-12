# Reputix Director checkpoint — 2026-11-12 12:10 p.m. Pacific

## Latest exact-head verification — PR #33
- PR #33 remains open, draft, unmerged.
- Handler contract workflow #28 passed: Deno type-check and 17/17 Node tests, including real Stripe HMAC acceptance and tampered-body rejection.
- PostgreSQL atomicity workflow #42 passed.
- Local PostgREST integration workflow #13 passed 2/2 tests using disposable PostgreSQL 17 + PostgREST, synthetic service_role JWT, and real Stripe HMAC. Signed subscription event processed through local RPC, duplicate delivery acknowledged without duplicate row, unknown signed event recorded as ignored.
- Browser QA run #483 passed.
- All four latest checks passed on the current candidate revision. This is local disposable integration, not hosted Supabase or real Stripe account verification.
- PR #33 candidate remains outside supabase/migrations. No staging/production migration or function deployment/invocation.

## PR #34 — owner complaint authorization
- Remains open, draft, unmerged.
- Candidate pins search_path empty and enforces verified owner claim plus approved business, matching current complaints UPDATE RLS policy.
- Isolated PostgreSQL workflow #4 and Browser QA #438 passed. No Supabase function, grant, RLS policy, data, or Auth setting changed.

## Production/staging read-only findings
- Relevant production/staging billing constraints match. Production payment_events.provider_event_id is globally unique.
- Production aggregate queries returned 0 rows in user_subscriptions and 0 in payment_events; Stripe-side subscription inventory remains unverified.
- Deployed production stripe-webhook v3 source verifies raw-body Stripe-Signature but performs subscription side effects before event logging. Candidate makes event claim and subscription mutation atomic.
- Candidate includes Stripe terminal incomplete_expired in its status CHECK; current app/server entitlement checks allow only active/trialing.
- Invoice failure recommendation: preserve Stripe's retrieved subscription status and do not synthesize past_due when Stripe still reports active. Isolated tests cover active -> past_due -> recovery.

## Other PRs
- PR #14 remains merged. PRs #30, #31, #32 remain draft/unmerged.
- Temporary test-only PR #35 was closed without merging.
- No PR merged and no draft marked ready.

## Remaining release gates
1. Hosted Supabase RPC integration in an approved isolated environment; local PostgREST does not certify Supabase Auth/RLS/Edge gateway behavior.
2. Stripe-side subscription inventory and signed test-mode event validation through an approved connected test account. No Stripe credentials/secrets or account inventory accessed.
3. Confirm STRIPE_EXPECT_LIVEMODE and test/live key pairing in the approved target environment; no project secret/config changed.
4. Complete staging schema diff/advisors and migration/dependency review before applying either candidate.
5. Continue real Auth, Storage upload, live RLS, billing lifecycle, and ad-serving QA in isolated environments.

## Safety boundary
- No production or staging migration, Edge Function deployment/invocation, real Stripe event, Checkout, charge, refund, secret read/write, Dashboard change, price/payout/webhook destination/live-test mode change, Auth/Storage/RLS change, domain/DNS change, or production data write.
- Preserve all accounts, businesses, reviews, photos, complaints, messages, and payment records.
- Keep PR #33 and #34 draft until all release gates pass and explicit approval is recorded.

Checkpoint recorded at 12:09:45 p.m. Pacific on November 12, 2026. Progress record only; not production release approval.