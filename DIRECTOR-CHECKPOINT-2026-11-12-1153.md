# Reputix Director checkpoint — 2026-11-12 11:53 a.m. Pacific

## Verified progress in this session
- PR #34 owner complaint RPC hardening remains draft/unmerged. Read-only production/staging audit found the current SECURITY DEFINER function is owned by postgres, has search_path=public, and is executable by postgres/authenticated/service_role only. The function validates auth.uid(), response length, and verified owner claim but omits businesses.status='approved', while the matching complaints UPDATE RLS policy requires approved business.
- PR #34 candidate pins search_path empty, schema-qualifies references, and enforces verified claim plus approved business. Expanded isolated PostgreSQL 17 workflow run #4 passed: verified-owner success, cross-business denial, pending/activity_verified/responsible_verified denial, unapproved-business denial, anon/null identity denial, short/blank/overlong response denial, and execute grants. Browser QA run #438 passed. Review comments #6834212845 and #6834196865 record verification. PR #34 remains draft/unmerged.
- PR #33 Stripe atomic webhook candidate remains draft/unmerged. Production and staging read-only catalog inspection confirmed relevant payment_events and user_subscriptions constraints match. Production payment_events has global UNIQUE(provider_event_id); user_subscriptions currently permits trialing, active, past_due, canceled, incomplete, unpaid, paused.
- Retrieved deployed production stripe-webhook v3 source read-only. It verifies raw-body Stripe-Signature but performs subscription writes before inserting payment_events, so later duplicate-ignore does not prevent duplicate side effects or out-of-order updates.
- The candidate now adds Stripe's terminal incomplete_expired to the candidate-only user_subscriptions CHECK. Isolated PostgreSQL tests persist this state; existing app/server entitlement gates accept only active/trialing, so incomplete_expired stays non-entitled.
- Recommended invoice behavior: do not synthesize past_due when invoice.payment_failed occurs but Stripe's retrieved subscription still reports active. Record the invoice failure separately, then apply newer authoritative customer.subscription.updated status and subsequent recovery state. Isolated PostgreSQL workflow run #11 passed active -> past_due -> active sequence.
- Latest PR #33 CI: Stripe PostgreSQL workflow run #11 SUCCESS and Browser QA run #448 SUCCESS. Comment #6834303371 records verification. Candidate production-schema review saved at docs/proposals/STRIPE-WEBHOOK-PRODUCTION-SCHEMA-REVIEW.md.
- PR #33 still requires real Edge Function integration/raw-body signature tests, legacy subscription reconciliation/backfill design, staging schema diff/advisors, and explicit release approval. No migration applied.
- Main checkpoint 11:51 saved as DIRECTOR-CHECKPOINT-2026-11-12-1151.md (commit cee3960f810af741e9e9faee675779a83985b386). This checkpoint updates it with the latest invoice lifecycle test and CI.

## Current PR status
- PR #33: open, draft, unmerged; PostgreSQL run #11 and Browser QA #448 passed.
- PR #34: open, draft, unmerged; PostgreSQL run #4 and Browser QA #438 passed.
- PRs #30, #31, #32 remain draft/unmerged. PR #14 remains merged.
- Do not mark drafts ready or merge automatically.

## Safety boundary
- No production or staging migration, function deployment/invocation, raw Stripe event, Checkout session, charge, refund, or secret access/change was performed.
- No Stripe Dashboard, price, payout, webhook destination, live/test mode, Auth, Storage, RLS, domain, or DNS setting was changed.
- Preserve all accounts, businesses, reviews, photos, complaints, messages, and payment records.
- Candidate SQL remains outside supabase/migrations. Do not apply it until the remaining review gates are met.

Checkpoint recorded at 11:52:41 a.m. Pacific on November 12, 2026. Progress record only; not production release approval.