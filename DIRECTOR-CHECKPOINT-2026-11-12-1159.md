# Reputix Director checkpoint — 2026-11-12 11:59 a.m. Pacific

## PR #34 — owner complaint authorization
- Open, draft, unmerged. Candidate hardens SECURITY DEFINER owner_respond_to_complaint with empty search_path and requires both verified owner claim and approved business, matching the current complaints UPDATE RLS policy.
- Read-only staging/production schema review recorded at docs/proposals/OWNER-COMPLAINT-RPC-STAGING-REVIEW.md.
- Isolated PostgreSQL 17 workflow run #4 passed; Browser QA run #438 passed. Tests cover verified-owner success, cross-business isolation, pending/activity_verified/responsible_verified denial, non-approved business denial, anon/null identity denial, short/blank/overlong response rejection, and EXECUTE grants.
- No Supabase function, grant, RLS policy, data, or Auth setting changed.

## PR #33 — Stripe webhook atomic RPC and Edge Function candidate
- Open, draft, unmerged. Candidate SQL remains outside supabase/migrations. No staging/production migration applied.
- Candidate adds atomic event claim + subscription mutation RPC, event.created ordering, duplicate/stale/equal/deleted-event protection, unknown event handling, legacy NULL-timestamp quarantine, rollback/retry, and service_role-only execute grant.
- Candidate extends user_subscriptions status CHECK with Stripe's terminal incomplete_expired. App/server entitlements remain active/trialing only, so incomplete_expired is non-entitled.
- Invoice behavior recommendation: persist retrieved Stripe subscription.status; do not synthesize past_due locally on invoice.payment_failed when Stripe still reports active. Isolated PostgreSQL tests cover active -> newer past_due -> recovery active.
- Read-only production and staging catalog inspection confirmed relevant payment_events and user_subscriptions constraints match. Production has 0 user_subscriptions rows and 0 payment_events rows; this does not prove Stripe account has no subscriptions, because Stripe-side inventory was not accessed.
- Deployed production stripe-webhook v3 source retrieved read-only. It verifies raw-body Stripe-Signature but writes subscription effects before event log insert, so later duplicate-ignore does not prevent duplicate side effects or stale updates.
- Candidate Edge Function adapter/core: supabase/functions/stripe-webhook/index.ts and core.mjs. Uses raw-body Stripe verification, explicit STRIPE_EXPECT_LIVEMODE=true|false, verified event.created, Stripe current subscription retrieval, and exactly one atomic RPC write. Duplicate/processed/ignored are acknowledged; failures return 5xx for retry. verify_jwt=false is required but has not been configured/deployed.
- Stripe SDK pinned to 23.1.0.
- Handler contract workflow #13 passed Deno type-check and 17/17 Node tests, including real HMAC acceptance and tampered-body rejection. Fake Supabase transport only; no real Supabase RPC or Stripe endpoint invoked.
- PostgreSQL atomicity workflow #27 passed. Browser QA run #466 was still in progress at checkpoint time; previous Browser QA run #460 passed.
- Handler design/review saved at docs/proposals/STRIPE-WEBHOOK-HANDLER-CANDIDATE-REVIEW.md; production schema/source review saved at docs/proposals/STRIPE-WEBHOOK-PRODUCTION-SCHEMA-REVIEW.md.

## PR status and safety
- PR #33 and #34 remain drafts; no draft marked ready and no PR merged.
- PRs #30, #31, #32 remain draft/unmerged. PR #14 remains merged.
- No production or staging database migration, Edge Function deployment/invocation, Stripe event, Checkout, charge, refund, secret read/write, Dashboard change, live/test mode change, price/payout/webhook destination change, Auth/Storage/RLS change, domain/DNS change, or production data write.
- Stripe-side subscription inventory still needs an approved Stripe account connection/test-mode workflow. No Stripe credentials or secrets were read.
- Isolated Supabase RPC integration and complete staging migration/advisor review remain blocked until a safe isolated schema environment is available. Do not use production as a test backend.

## Next ordered steps
1. Finish latest Browser QA run #466 and record result.
2. Complete isolated Supabase RPC integration in a disposable/staging environment only after schema and migration baseline are available; do not apply to current staging blindly.
3. Verify Stripe-side subscription inventory through an approved connected test-mode account; do not infer from empty DB tables.
4. Confirm STRIPE_EXPECT_LIVEMODE and test/live key pairing in a separately approved environment; do not read or change production secrets.
5. Keep PR #33 and #34 draft until integration, schema diff/advisors, migration order, and explicit release approval pass.
6. Continue real Auth, Storage upload, live RLS, billing, and ad-serving launch tests in isolated environments.

Checkpoint recorded at 11:59:26 a.m. Pacific on November 12, 2026. Progress record only; not production release approval.