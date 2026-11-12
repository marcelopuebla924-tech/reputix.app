# Stripe webhook source archive

- Captured from the active Supabase Edge Function `stripe-webhook` on 2026-11-12.
- Deployed version observed: v3 (ACTIVE).
- JWT verification: disabled at the gateway, as expected for a Stripe-signed webhook; the handler verifies the Stripe signature against the raw request body.
- This file is a source-control archive of the deployed implementation, not a new deployment.
- No secrets, environment values, webhook events, customer data, or payment records were read or copied.
- No Supabase production configuration or function deployment was changed.

## Known review items — not yet fixed

1. The handler performs subscription side effects before inserting `payment_events.provider_event_id`. Duplicate delivery is therefore not claimed atomically before processing.
2. There is no event-order guard preventing an older Stripe event from overwriting a newer subscription state.
3. The unique event ID constraint only prevents duplicate event-log rows; it does not by itself provide exactly-once side effects.
4. Do not add a non-atomic read-then-write deduplication check as a substitute: concurrent deliveries could both pass it.
5. A durable fix requires an atomic event-claim/processing design and a defined recovery path for events left in a processing state. That schema change must be tested in an isolated environment first.

## Required verification before any deployment

- Reconstruct the staging schema and event-table constraints from reviewed sources.
- Test duplicate delivery sequentially and concurrently.
- Test out-of-order subscription.updated, invoice.payment_failed, invoice.paid, and subscription.deleted events.
- Test retry after a simulated failure between event claim and subscription update.
- Verify that the final subscription state cannot regress based on an older event.
- Verify Stripe test-mode signature validation and idempotent responses.
- Review rollback and recovery for stuck processing events.

**Do not deploy this archived source as a change.** The production function remains at v3 until a separately reviewed PR, staging test suite, and explicit deployment decision are completed.
