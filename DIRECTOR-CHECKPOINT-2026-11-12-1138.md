# Reputix Director checkpoint — 2026-11-12 11:38 a.m. Pacific

## Current verified state
- Repository: marcelopuebla924-tech/reputix.app
- Main branch head observed before this checkpoint: 35059d0f2fd7a0bcf633630a23efc07ab43e545f
- PR #14 is merged; its Browser QA run #374 completed successfully.
- Latest profile/address work includes commits 35059d0 (approved public profile refresh), 9b5db27 (preserve valid address suffixes), and a4544a0 (validate public profile locations).
- Browser QA run #429 completed successfully, including approved-only static profile generation and browser smoke tests.
- Stripe webhook atomic RPC candidate test run #2 completed successfully in an isolated PostgreSQL service container. Its test job passed independent-session duplicate claiming, stale/equal event ordering, transaction rollback, and retry behavior.

## Review decisions and safety boundaries
- PR #30 (archive of deployed Stripe webhook v3 source), PR #31 (idempotency design), and PR #32 (staging/Stripe status report) remain draft and unmerged. Their Browser QA runs #423, #424, and #425 passed. Do not mark ready or merge automatically; preserve draft review status.
- PR #33 remains draft and candidate-only. Its isolated PostgreSQL test run passed, but a review comment was added (review ID 5880920858) requesting further tests and a safe legacy-subscription timestamp backfill/reconciliation plan.
- Critical PR #33 gap: adding nullable provider_event_created_at columns leaves existing subscription rows with NULL. A delayed older event could overwrite a current legacy snapshot unless subscriptions are reconciled/backfilled or quarantined before enabling the RPC.
- Additional required gates: subscription.deleted then stale update; unknown event handling; actual plan/status constraints; provider/event uniqueness assumptions; Supabase role grants and SECURITY DEFINER ownership; raw-body Stripe signature tests; staging schema diff/advisors; Edge Function integration; explicit handling of invoice.payment_failed without locally fabricating a status.
- Do not apply candidate SQL to staging or production. Do not deploy or modify Stripe settings.
- Production webhook remains deployed v3. No production database, Stripe, customer, payment, Auth, Storage, domain, or DNS changes were made in this work.
- Reputix-Staging read-only inspection previously confirmed ACTIVE_HEALTHY, 20 public base tables with RLS enabled, 35 RLS policies, and no Storage buckets. Do not replay the staging baseline. Storage configuration remains a separate release gate.
- Preserve all existing businesses, users, reviews, photos, and accounts. Do not change domain/DNS, live Stripe mode/prices/payouts/webhook destination, or sensitive auth settings without explicit approval.

## Next ordered tasks
1. Keep PR #33 draft and strengthen the isolated tests and legacy-row migration/reconciliation design.
2. Review actual staging schema/constraints and advisor findings read-only; do not write to staging.
3. Build isolated Edge Function integration tests for raw-body signature verification and RPC result handling.
4. Resolve invoice failure/status mapping against Stripe's authoritative subscription object.
5. Only after all gates pass, prepare a separate staging-only migration/integration PR for review; production deployment remains a separate explicit decision.
6. Continue product launch QA separately: registration/login, owner verification, photo upload/storage bucket setup, business/review flows, and all visible buttons. Do not claim completion without browser evidence.

## Timestamp
Checkpoint recorded by LEO at 11:38 a.m. Pacific on November 12, 2026. This is a repository progress record, not a production release approval.
