# Reputix Director checkpoint — 2026-11-12 11:50 a.m. Pacific

## Verified progress
- PR #34 (owner complaint RPC hardening) remains draft/unmerged. Read-only production/staging schema review confirmed current SECURITY DEFINER function owner postgres, search_path=public, and EXECUTE ACL for postgres/authenticated/service_role only; no anon/PUBLIC execution. Current RLS update policy requires both verified owner claim and approved business, but the current function omits the approved-business check. Candidate pins search_path empty and adds that predicate.
- PR #34 expanded isolated PostgreSQL run #4 passed. Tests cover verified owner success, cross-business isolation, pending/activity_verified/responsible_verified claim denial, non-approved business denial, anon/null identity denial, short/blank/overlong response denial, and expected grants. Browser QA run #438 passed. Review comment #6834212845 records final verification.
- PR #33 (Stripe webhook atomic RPC) remains draft/unmerged. Read-only production and staging catalog inspection confirmed relevant payment_events and user_subscriptions constraints match. Production payment_events has global UNIQUE(provider_event_id); user_subscriptions status CHECK currently excludes Stripe's terminal incomplete_expired state.
- Deployed production stripe-webhook v3 source was retrieved read-only. It verifies raw-body Stripe-Signature, but performs subscription writes before event-log insert; duplicate-ignore after side effects does not prevent repeated processing/out-of-order updates. invoice.payment_failed locally synthesizes past_due while retrieved Stripe status is active; product mapping decision remains unresolved.
- Candidate PR #33 now adds incomplete_expired to its candidate status CHECK and validates/persists it in the isolated PostgreSQL fixture. App/server entitlement checks currently allow only active/trialing, so incomplete_expired remains non-entitled. Stripe API docs describe incomplete_expired as terminal after initial invoice failure; official reference: https://docs.stripe.com/api/subscriptions/object.
- Stripe PostgreSQL workflow run #7 passed on SQL/test-code revision 30b610b299ac1086ec7e5191f7af6d01449e28c7. Browser QA run #442 was still in progress at checkpoint time.
- PR #33 production schema/deployed handler review saved at docs/proposals/STRIPE-WEBHOOK-PRODUCTION-SCHEMA-REVIEW.md. PR #33 comment #6834244866 records current test status.
- Main checkpoint at 11:45 remains saved as DIRECTOR-CHECKPOINT-2026-11-12-1145.md; this checkpoint supplements it.

## Safety and remaining gates
- PR #33 and #34 remain drafts. No merge or deployment performed.
- No Supabase staging or production migration, Edge Function invocation/deployment, Stripe event, Checkout, charge, refund, or secret read/write performed.
- No Stripe Dashboard, prices, payouts, webhook destination, live/test mode, Auth, Storage, RLS, or domain/DNS settings changed.
- PR #33 still requires browser QA completion, Edge Function integration/raw-body signature tests, explicit invoice.payment_failed model, legacy subscription reconciliation, and full staging migration/advisor review.
- PR #34 still requires final staging migration/dependency review before any application; no project mutation authorized by this checkpoint.
- Preserve all user accounts, businesses, reviews, photos, complaints, messages, and payment records.

Checkpoint recorded at 11:50 a.m. Pacific on November 12, 2026. Progress record only; not production release approval.