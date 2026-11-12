# Reputix Director checkpoint — 2026-11-12 12:27 p.m. PST

## Objective 3: Stripe webhook ordering and atomicity review

### Candidate PR #33 — exact head reviewed
- PR: https://github.com/marcelopuebla924-tech/reputix.app/pull/33
- Branch: `feat/stripe-webhook-atomic-claim-candidate`
- Head: `75a307362c5bfaa0743f19959386f1d05292a260`
- PR remains OPEN and DRAFT; GitHub reports mergeable=false. No merge performed.
- Candidate code is isolated under proposal/docs and a feature branch; no migration was applied to staging or production.

### Current candidate checks on exact head
All four latest workflow runs completed successfully:
- Stripe webhook handler contract tests — success (Deno type-check and 17/17 Node tests, including Stripe HMAC valid/tampered body cases).
- Stripe webhook atomic RPC candidate tests — success (PostgreSQL 17 concurrency, duplicate, stale/equal timestamp, deleted subscription, legacy NULL timestamp quarantine, rollback/retry, ACL checks).
- Stripe webhook local PostgREST integration — success (2/2 synthetic signed-event tests against disposable local PostgreSQL/PostgREST).
- Reputix Browser QA — success.
These are isolated CI results, not hosted Supabase or real Stripe account validation.

### Read-only schema/inventory observations
- Production and staging payment/subscription constraints were previously compared and found aligned for the candidate's expected columns and current unique constraints.
- Fresh staging aggregate query returned 0 rows in `public.user_subscriptions` and 0 rows in `public.payment_events`.
- Prior production aggregate query also returned 0 rows in both tables.
- This does NOT prove there are no Stripe-side subscriptions; no Stripe Dashboard/API inventory, secrets, test webhook, checkout, or payment was accessed.
- Candidate migration adds `provider_event_created_at` timestamps and extends subscription status CHECK to include `incomplete_expired`. Current app entitlements remain deny-by-default for all statuses except active/trialing.

### Main release blockers
1. Reconcile Stripe-side inventory through an approved test-mode/account workflow before routing any existing subscription events through the new timestamp guard.
2. Complete hosted Supabase integration against an isolated approved Supabase project; local PostgREST is not equivalent to hosted Supabase gateway/Auth/RLS behavior.
3. Review SECURITY DEFINER owner/ACL and post-migration advisors in staging before considering application.
4. Confirm Stripe environment mode and test-mode key/webhook pairing only through an approved test environment.
5. Keep invoice failure behavior aligned to Stripe's authoritative subscription status; candidate removes local synthetic `past_due` when retrieved Stripe status remains active.
6. Resolve GitHub mergeability and complete review before any merge.

### Safety
- No Stripe Dashboard changes, Checkout, charges, webhook delivery, secrets, payout settings, prices, webhook destination, Auth, production/staging migration, Edge Function deployment, or user data writes occurred.
- PR #33 remains draft/unmerged. Do not deploy the candidate or alter live Stripe configuration without the remaining release gates.

## Next objective
Return to the Reputix AI test harness and production drift release gates, then complete staging-equivalent tests for owner complaint RPC without weakening the staging foreign keys or verification constraints.
