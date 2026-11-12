# Stripe atomic webhook candidate — review notes

Status: **candidate only; not applied**. Prepared 2026-11-12 from the read-only Reputix-Staging schema inspection and the archived active webhook v3 source.

## Scope and observed schema

The staging schema has:
- `payment_events.provider_event_id` with a unique constraint (currently globally unique, not scoped by provider).
- `payment_events.processing_status` constrained to `received | processed | failed | ignored`.
- `user_subscriptions.provider_subscription_id` unique.
- Subscription statuses constrained to `trialing | active | past_due | canceled | incomplete | unpaid | paused`.
- `user_subscriptions.plan_code` references `monetization_plans(code)`; the archived handler currently sends `basic | pro`.

The candidate adds nullable `provider_event_created_at` columns to both tables so existing records remain valid. The RPC uses the existing uniqueness constraints; it does not create new event rows or subscription identities outside those constraints.

## Transaction behavior

`public.process_stripe_webhook_event(...)`:
1. Inserts the Stripe event claim before any subscription mutation.
2. Relies on the unique event ID constraint and `ON CONFLICT DO NOTHING`; concurrent duplicate inserts serialize at the unique index. Only the winning transaction proceeds.
3. Upserts a subscription only when the incoming Stripe `event.created` timestamp is strictly newer than the last applied timestamp. Equal-second timestamps are ignored; do not infer order from event IDs.
4. Marks the event `processed` or `ignored` in the same transaction.
5. Any exception rolls back both the claim and subscription write, allowing Stripe retry.

The function pins an empty search path, fully qualifies objects, revokes execution from PUBLIC/anon/authenticated, and grants only service_role. The function is in public because the Edge Function calls it through Supabase PostgREST RPC; its execute ACL is intentionally narrow.

## Important integration work still required

The existing deployed v3 handler does not call this RPC. A future Edge Function change must:
- retain raw-body Stripe signature verification;
- derive `p_event_created_at` from the verified event's immutable `event.created` (Unix seconds);
- fetch Stripe's current subscription object where needed, then pass its mapped fields plus the signed event timestamp;
- call this RPC exactly once per event and return 2xx for `duplicate`, `processed`, or `ignored`;
- return 5xx for transaction failures so Stripe retries;
- never write `payment_events` or `user_subscriptions` separately for the same event.

The existing invoice-payment-failed behavior locally synthesizes `past_due` when Stripe still reports active. This is a business-state decision that must be revisited during integration; do not blindly preserve or remove it.

## Release blockers

- This candidate has not been executed against any database.
- No real two-session PostgreSQL concurrency test has run.
- No schema diff/advisor run has been completed against a disposable database.
- Equal-second Stripe event timestamps cannot be ordered reliably by timestamp; the RPC deliberately does not overwrite on equality. A later reconciliation from Stripe's authoritative subscription object may be needed.
- No Edge Function integration or Stripe test-mode signature test has been completed.
- Do not apply this file, deploy it, or merge it as a production change until the release gates are satisfied.
