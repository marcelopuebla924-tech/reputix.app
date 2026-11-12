# Reputix Director checkpoint — 2026-11-12 11:54 a.m. Pacific

## Latest verified progress
- PR #34 owner complaint RPC hardening remains draft/unmerged. Read-only production/staging review found the current SECURITY DEFINER function omits the approved-business predicate required by the matching complaints RLS policy. Candidate pins search_path empty and enforces verified owner claim plus approved business. Expanded isolated PostgreSQL run #4 passed and Browser QA #438 passed. No Supabase changes.
- PR #33 Stripe atomic webhook candidate remains draft/unmerged. PostgreSQL workflow run #11 and Browser QA #448 passed. Tests cover concurrent and sequential duplicate event claims, stale/equal ordering, deleted-then-stale protection, unknown event ignore, legacy NULL timestamp quarantine, rollback/retry, function grants, Stripe incomplete_expired persistence, and invoice failure -> authoritative past_due -> recovery to active.
- Production and staging catalog constraints for payment_events and user_subscriptions match. Production payment_events has global UNIQUE(provider_event_id); production user_subscriptions status CHECK originally excluded Stripe's incomplete_expired terminal status. Candidate-only SQL adds that status; existing app/server entitlement gates still allow only active/trialing.
- Read-only production aggregate query returned 0 rows in user_subscriptions and 0 in payment_events. There are no existing Reputix DB subscription rows to timestamp-backfill at this moment. This does NOT prove Stripe account has no subscriptions outside Reputix; Stripe-side inventory was not accessed.
- Deployed production stripe-webhook v3 source was retrieved read-only. It verifies raw-body Stripe-Signature, but writes subscription effects before event logging; duplicate-ignore after side effects does not prevent duplicate processing or stale overwrites. Candidate integration recommendation: use Stripe's retrieved subscription status for invoice.payment_failed, log invoice failure separately, then follow later authoritative subscription.updated/invoice.paid states. This sequence passed isolated tests.
- Production review saved at docs/proposals/STRIPE-WEBHOOK-PRODUCTION-SCHEMA-REVIEW.md. PR #33 body records zero DB rows and the need to verify Stripe-side inventory before enablement.
- Main checkpoints: DIRECTOR-CHECKPOINT-2026-11-12-1151.md (cee3960f810af741e9e9faee675779a83985b386) and DIRECTOR-CHECKPOINT-2026-11-12-1153.md (7650518a41c4e2587521cf6d880bc9098eaf4139).

## PR status
- PR #33: open, draft, unmerged; PostgreSQL run #11 and Browser QA #448 passed.
- PR #34: open, draft, unmerged; PostgreSQL run #4 and Browser QA #438 passed.
- PRs #30, #31, #32 remain draft/unmerged. PR #14 remains merged.
- No draft marked ready; no PR merged.

## Next ordered work
1. PR #33: inspect the existing Edge Function integration surface and prepare isolated signature/RPC contract tests without invoking or deploying production functions.
2. Confirm Stripe-side subscription inventory only in a separately approved test-mode workflow; do not infer from empty Reputix tables.
3. Complete staging schema diff/advisors and migration review. Keep candidate SQL outside supabase/migrations until approved.
4. PR #34: complete migration/dependency review before any staging application.
5. Continue launch QA for real Auth, Storage upload, live RLS, billing lifecycle, and public ad serving only in an isolated environment.

## Safety boundary
- No production/staging migration, Edge Function deployment/invocation, Stripe event, Checkout, charge, refund, or secret access/change performed.
- No Stripe Dashboard, mode, prices, payout, webhook destination, Auth, Storage, RLS, domain, or DNS settings changed.
- Preserve all accounts, businesses, reviews, photos, complaints, messages, and payment records.

Checkpoint recorded at 11:53:12 a.m. Pacific on November 12, 2026. Progress record only; not production release approval.