# Stripe atomic webhook candidate — review notes

Status: **candidate only; not applied**. Prepared 2026-11-12 from the read-only Reputix-Staging schema inspection and the archived active webhook v3 source.

## Scope and observed schema

The staging schema has:
- `payment_events.provider_event_id` with a unique constraint (currently globally unique, not scoped by provider).
- `payment_events.processing_status` constrained to `received | processed | failed | ignored`.
- `user_subscriptions.provider_subscription_id` unique.
- Subscription statuses constrained to `trialing | active | past_due | canceled | incomplete | unpaid | paused`.
- `user_subscriptions.plan_code` references `monetization_plans(code)`; the archived handler currently sends `basic | pro`.

The candidate adds nullable `provider_event_created_at` columns. Existing subscription rows will therefore have NULL timestamps until reconciled. The RPC deliberately refuses to overwrite a conflicting legacy subscription row whose timestamp is NULL. Such rows must be backfilled from Stripe's authoritative current subscription state (or explicitly quarantined) before enabling the RPC for existing subscriptions. New subscription rows can still be inserted with a verified event timestamp.

The RPC uses the observed uniqueness constraints; it does not create new event rows or subscription identities outside those constraints.

## Transaction behavior

`public.process_stripe_webhook_event(...)`:
1. Inserts the Stripe event claim before any subscription mutation.
2. Relies on the unique event ID constraint and `ON CONFLICT DO NOTHING`; concurrent duplicate inserts serialize at the unique index. Only the winning transaction proceeds.
3. Upserts a subscription only when the incoming Stripe `event.created` timestamp is strictly newer than the last applied timestamp. Equal-second timestamps are ignored; do not infer order from event IDs.
4. Does not overwrite legacy subscription rows with NULL event timestamps until reconciliation has populated a trustworthy timestamp.
5. Marks the event `processed` or `ignored` in the same transaction.
6. Any exception rolls back both the claim and subscription write, allowing Stripe retry.

The function pins an empty search path, fully qualifies objects, revokes execution from PUBLIC/anon/authenticated, and grants only service_role. The function is in public because the Edge Function calls it through Supabase PostgREST RPC; its execute ACL is intentionally narrow. The isolated fixture currently verifies the expected execute grants, but actual Supabase function ownership and advisor findings remain to be reviewed.

## Isolated test coverage completed

The candidate GitHub Actions workflow uses a disposable PostgreSQL 17 service container, not a Supabase project. Its successful run #2 covered:
- Two independent psql sessions racing to claim the same event: one processed, one duplicate.
- Sequential duplicate delivery.
- Newer event followed by stale older event.
- Equal-second event not overwriting the current subscription snapshot.
- Subscription deleted followed by a stale update: no reactivation.
- Unknown event type recorded as ignored without a subscription mutation.
- Legacy row with NULL timestamp quarantined from overwrite.
- Simulated exception during subscription insert: transaction rolls back the event claim.
- Expected function execute grants for service_role versus anon/authenticated.

This isolated result is not proof of compatibility with the live Supabase project or deployed Edge Function.

## Important integration work still required

The existing deployed v3 handler does not call this RPC. A future Edge Function change must:
- retain raw-body Stripe signature verification;
- derive `p_event_created_at` from the verified event's immutable `event.created` (Unix seconds);
- fetch Stripe's current subscription object where needed, then pass its mapped fields plus the signed event timestamp;
- call this RPC exactly once per event and return 2xx for `duplicate`, `processed`, or `ignored`;
- return 5xx for transaction failures so Stripe retries;
- never write `payment_events` or `user_subscriptions` separately for the same event;
- reconcile existing subscription rows before routing their events through the timestamp guard.

The existing invoice-payment-failed behavior locally synthesizes `past_due` when Stripe still reports active. This is a business-state decision that must be revisited during integration; do not blindly preserve or remove it. Define and test the final mapping using Stripe's authoritative state.

## Remaining release blockers

- No migration has been applied to staging; no live Supabase schema diff or advisor run has been completed for this candidate.
- No Edge Function integration or Stripe test-mode raw-body signature test has been completed.
- Actual plan rows and all status mappings must be validated against the current staging schema and Stripe event payloads.
- Provider/event uniqueness assumptions and SECURITY DEFINER ownership/privileges need an explicit review against Supabase.
- Equal-second Stripe event timestamps cannot be ordered reliably by timestamp; the RPC deliberately does not overwrite on equality. Reconcile from Stripe's authoritative subscription object where needed.
- The legacy-row reconciliation/backfill must be designed, tested, and completed before enabling the RPC for existing subscriptions.
- Do not apply this file, deploy it, or merge it as a production change until all release gates are satisfied.
