# Reputix Director checkpoint — 2026-11-12 12:08 p.m. Pacific

## PR #33 — Stripe webhook atomic RPC and Edge Function candidate
- Open, draft, unmerged. Candidate SQL remains outside supabase/migrations. No production/staging migration applied.
- Atomic PostgreSQL workflow #27 passed. Coverage includes concurrent/sequential duplicate claims, stale/equal ordering, deleted-then-stale protection, unknown event ignore, legacy NULL timestamp quarantine, rollback/retry, function grants, incomplete_expired persistence, and invoice failure -> authoritative past_due -> recovery sequence.
- Handler contract workflow #13 passed Deno type-check and 17/17 Node tests. Stripe SDK pinned to 23.1.0. Tests include real Stripe HMAC signature acceptance and tampered-body rejection, raw-body preservation, explicit livemode, event.created, trusted metadata/fallback, unknown/missing metadata ignore, incomplete_expired passthrough, RPC-only writes, duplicate acknowledgement, and 5xx retry.
- Browser QA run #474 passed on the candidate revision before fixture-only correction.
- Local PostgREST integration workflow #12 passed 2/2 tests using disposable PostgreSQL 17 + PostgREST, synthetic service_role JWT, and real Stripe HMAC. A signed subscription event reached the real local RPC and was processed; second delivery returned duplicate; an unknown signed event was stored as ignored. Only local disposable database used; no hosted Supabase or real Stripe account.
- Production/staging read-only catalog inspection confirmed relevant payment_events and user_subscriptions constraints match. Production payment_events.provider_event_id is globally unique. Production currently has 0 user_subscriptions rows and 0 payment_events rows; this does not prove Stripe account has no subscriptions.
- Deployed production stripe-webhook v3 source reviewed read-only. It verifies raw-body Stripe-Signature but writes subscription effects before event logging; candidate RPC makes claim and mutation atomic.
- Candidate adds Stripe terminal incomplete_expired to the candidate-only status CHECK; app/server entitlements still allow only active/trialing.
- Recommended invoice behavior: preserve retrieved Stripe subscription.status on invoice.payment_failed; do not locally synthesize past_due while Stripe still reports active. Record invoice failure separately and apply newer authoritative subscription status. Isolated tests passed.
- Handler and production review docs saved under docs/proposals/STRIPE-WEBHOOK-HANDLER-CANDIDATE-REVIEW.md and STRIPE-WEBHOOK-PRODUCTION-SCHEMA-REVIEW.md.
- PR #33 latest comment #6834648438 records local PostgREST success.

## PR #34 — owner complaint authorization candidate
- Open, draft, unmerged. Candidate requires verified owner claim and approved business; pins search_path empty and preserves authenticated/service_role execution while revoking PUBLIC/anon.
- Read-only staging/production audit found existing SECURITY DEFINER function omits approved-business predicate while the matching RLS UPDATE policy requires it.
- Isolated PostgreSQL workflow #4 passed; Browser QA #438 passed. Tests cover verified owner, cross-business, pending/activity_verified/responsible_verified, non-approved business, anon/null caller, response length, and execute grants.
- No Supabase function, grant, RLS policy, data, or Auth setting changed.

## Other PRs and temporary validation
- PR #14 remains merged. PRs #30, #31, #32 remain draft/unmerged.
- Temporary test-only PR #35 was closed without merging; it did not alter main or production.
- PR #33 and #34 remain drafts; no draft marked ready and no PR merged.

## Remaining gates
1. Hosted Supabase RPC integration in an approved isolated environment. Local PostgREST verifies HTTP/RPC contract but not Supabase Auth/RLS/Edge gateway behavior.
2. Stripe-side subscription inventory verification and signed test-mode event validation through an approved connected Stripe test account. No Stripe credentials/secrets or account inventory accessed.
3. Confirm STRIPE_EXPECT_LIVEMODE and test/live key pairing in the approved target environment; no project secret/config changed.
4. Complete staging schema diff/advisors and migration/dependency review before applying either candidate.
5. Continue real Auth, Storage upload, live RLS, billing lifecycle, and ad-serving QA in isolated environments.

## Safety boundary
- No production or staging migration, Edge Function deployment/invocation, real Stripe event, Checkout, charge, refund, secret read/write, Dashboard change, price/payout/webhook destination/live-test mode change, Auth/Storage/RLS change, domain/DNS change, or production data write.
- Preserve all accounts, businesses, reviews, photos, complaints, messages, and payment records.
- Keep PR #33 and #34 draft until all release gates pass and explicit approval is recorded.

Checkpoint recorded at 12:08:17 p.m. Pacific on November 12, 2026. Progress record only; not production release approval.