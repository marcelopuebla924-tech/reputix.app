# Reputix Director checkpoint — 2026-11-12 11:51 a.m. Pacific

## Completed in this continuation
- PR #34 owner complaint RPC hardening remains draft/unmerged. Read-only production/staging audit confirmed the current SECURITY DEFINER function is owned by postgres, has search_path=public, and is executable by postgres/authenticated/service_role only. The current function enforces auth.uid(), response length, and verified owner claim but omits businesses.status='approved', while the matching complaints UPDATE RLS policy requires approved business too.
- PR #34 candidate uses empty search_path, schema-qualified references, verified claim plus approved business, and preserves authenticated/service_role execute surface while revoking PUBLIC/anon. Expanded disposable PostgreSQL 17 tests passed workflow run #4: verified-owner success, cross-business denial, pending/activity_verified/responsible_verified denial, unapproved-business denial, anon/null identity denial, short/blank/overlong response denial, and execute grants. Browser QA run #438 passed. Comments #6834212845 and #6834196865 record verification.
- PR #34 staging review is saved at docs/proposals/OWNER-COMPLAINT-RPC-STAGING-REVIEW.md. No staging/production function, grant, RLS policy, data, or Auth setting was changed.
- PR #33 Stripe atomic webhook candidate remains draft/unmerged. Read-only catalog inspection of production (udvsrmfgjfinwbgvhchs) and staging (lzcyulncvjjxsyyivlty) confirmed relevant payment_events and user_subscriptions constraints match. Production payment_events has global UNIQUE(provider_event_id); user_subscriptions status CHECK allows trialing, active, past_due, canceled, incomplete, unpaid, paused.
- Retrieved deployed production stripe-webhook v3 source read-only. It verifies raw-body Stripe-Signature but writes subscription effects before recording the event, so later duplicate-ignore does not prevent duplicate side effects/out-of-order overwrites. It also synthesizes past_due on invoice.payment_failed when Stripe's retrieved subscription still reports active; product behavior remains unresolved.
- Stripe API status review found incomplete_expired is a current terminal Stripe Subscription status. The candidate now adds it to the candidate-only user_subscriptions CHECK and validates persistence in the isolated PostgreSQL fixture. App/server entitlement gates still allow only active/trialing, so incomplete_expired does not unlock paid access.
- PR #33 isolated PostgreSQL workflow run #7 passed on SQL/test-code revision 30b610b299ac1086ec7e5191f7af6d01449e28c7. Browser QA run #442 passed. Comment #6834259533 records final CI verification.
- PR #33 production schema/deployed handler review saved at docs/proposals/STRIPE-WEBHOOK-PRODUCTION-SCHEMA-REVIEW.md. No migration applied to staging/production; no Edge Function deployed or invoked; no Stripe event, checkout, charge, secret read/write, Dashboard, webhook, price, payout, or mode change.
- Main checkpoint at 11:50 a.m. is saved as DIRECTOR-CHECKPOINT-2026-11-12-1150.md (commit 8a3a56e5574c4bc8a63b60411431ae2b9fa6d23f). This 11:51 checkpoint supersedes its in-progress test status.

## Current PR status
- PR #33: open, draft, unmerged; isolated PostgreSQL run #7 and Browser QA #442 passed.
- PR #34: open, draft, unmerged; isolated PostgreSQL run #4 and Browser QA #438 passed.
- PRs #30, #31, #32 remain draft/unmerged. PR #14 remains merged.
- Do not mark drafts ready or merge automatically.

## Remaining ordered work
1. PR #33: decide the correct invoice.payment_failed model; do not persist a synthetic past_due while Stripe reports active unless a separate payment-issue state is intentionally designed.
2. PR #33: design and test authoritative Stripe reconciliation/backfill for existing subscriptions before the new timestamp guard is enabled; legacy NULL timestamp rows remain quarantined.
3. PR #33: build isolated Edge Function integration tests preserving raw-body signature verification, event.created ordering, metadata linkage, duplicate/ignored/retry response handling, and event.livemode expectations. No real Stripe test events or function deployments yet.
4. PR #33: complete staging schema diff/advisors and migration review before any application. Candidate SQL remains outside supabase/migrations.
5. PR #34: complete migration/dependency review before any staging application; current candidate is not applied.
6. Launch QA still needs real Auth, Storage upload, live RLS integration, billing lifecycle, and public ad serving tests in an isolated environment. Current browser suite uses local site and synthetic/mocked API data.
7. Preserve production and user data; do not modify domain/DNS, protected Auth, Stripe live mode/prices/payout/webhook destination/secrets, or production DB without explicit approval.

Checkpoint recorded at 11:50:42 a.m. Pacific on November 12, 2026. This is a progress record, not production release approval.