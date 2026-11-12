# Stripe webhook idempotency and ordering design

Status: design only. No production or staging database changes are included.

## Current implementation risks

The archived production `stripe-webhook` v3 handler updates `user_subscriptions` before inserting the Stripe event ID into `payment_events`. A duplicate delivery can therefore repeat the subscription side effect. It also does not compare Stripe event creation times before applying a subscription state, so an older event delivered later can overwrite newer state.

A unique constraint on `payment_events.provider_event_id` is necessary but is not sufficient: recording the event after the side effect does not make the side effect idempotent.

## Proposed transaction boundary

Use one database transaction, exposed through a narrowly scoped Postgres RPC, for the event claim and all database state changes caused by that event. Do not implement a REST read-then-write deduplication sequence.

Conceptual transaction:

1. Insert a `payment_events` row with provider, provider event ID, event type, Stripe `event.created`, and a processing status.
2. Use the unique key on (provider, provider_event_id) with `ON CONFLICT DO NOTHING`.
3. If no row was inserted, return a duplicate result without changing subscription state.
4. For subscription events, upsert the subscription only when the incoming Stripe event timestamp is not older than the last applied provider event timestamp for that subscription.
5. Mark the event processed in the same transaction.
6. Commit. If any database step fails, roll back the claim and subscription update together so Stripe can safely retry.

The exact RPC signature, conflict key, columns, and ownership checks must be based on the reviewed staging schema—not guessed from this conceptual design.

## Handling Stripe API reads

The Edge Function may retrieve the latest subscription object from Stripe before calling the RPC, but the RPC must still receive and persist the signed event's immutable ID and creation timestamp. Event ordering must be based on the event timestamp, not the time the webhook arrived.

For invoice events, define an explicit mapping from the event to the subscription state. Avoid fabricating a subscription status locally if Stripe's authoritative subscription object does not represent that state. Store payment-failure information separately if the product needs a past-due indicator.

## Recovery and retry rules

- Duplicate event already processed: acknowledge successfully; do not repeat side effects.
- Duplicate event currently processing: do not run the side effect a second time. Return a retryable response or use a bounded lease/recovery protocol designed and tested in staging.
- Database transaction failure: rollback; return 5xx so Stripe retries.
- Event older than the last applied event timestamp: record it as processed/ignored without regressing the subscription.
- Unknown event type: record as ignored and acknowledge after the transaction succeeds.
- Never mark an event processed before its corresponding database state update commits.

Prefer a single transaction that either commits all database effects or none. A lease/worker design is only needed if processing must span non-transactional external side effects.

## Required isolated tests

1. Same event delivered twice sequentially: one claim and one subscription state change.
2. Same event delivered concurrently: one transaction wins; the other sees duplicate.
3. Newer subscription update followed by older update: final state remains from the newer event.
4. Older event followed by newer event: final state advances.
5. Failure during subscription upsert: claim rolls back and retry can process.
6. Unknown event type: event is logged once as ignored.
7. Invoice payment failure and paid events: expected status/metadata mapping is explicit and does not regress newer subscription state.
8. Deleted subscription event followed by stale update: stale update cannot reactivate the subscription.
9. Duplicate delivery after a successful commit: 2xx acknowledgement with no additional write.
10. Stripe test-mode signature verification: valid raw-body signature accepted; missing/invalid signature rejected.

## Release gates

- Reconstruct and review the staging schema, constraints, triggers, functions, grants, and RLS dependencies.
- Implement the RPC and migration only against isolated staging.
- Run sequential and concurrent tests against Postgres, not only mocked JavaScript tests.
- Test retry/recovery behavior and stale-event ordering.
- Run the existing browser suite and Edge Function tests.
- Review rollback and operational recovery.
- Only then prepare a separate deployment PR and request explicit deployment approval.

## Safety boundary

This document does not change the deployed Supabase function, Stripe configuration, production database, user plans, payment events, customers, or domain settings. Do not deploy the archived v3 source or any proposed RPC until all release gates pass.
