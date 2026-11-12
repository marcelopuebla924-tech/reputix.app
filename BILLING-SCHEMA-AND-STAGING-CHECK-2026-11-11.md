# Billing Schema and Staging Checkpoint — 11 Nov 2026

Read-only verification. No SQL writes, migrations, test payments, checkout sessions, Stripe events, or production data mutations were performed.

## Production billing catalog verified

### monetization_plans
Active catalog rows observed:
- `free`: $0.00 USD
- `basic`: $13.00 USD
- `pro`: $25.00 USD

These are existing production catalog values. No price or Stripe Price ID was changed.

### user_subscriptions
- Primary key: `id`.
- Foreign keys: `user_id -> auth.users(id) ON DELETE CASCADE`; `plan_code -> monetization_plans(code)`.
- Unique: `provider_subscription_id`.
- Checks: provider must be stripe; status is one of trialing, active, past_due, canceled, incomplete, unpaid, paused.
- No unique constraint/index on `user_id` or active subscription per user was observed. Multiple historical/current subscription rows per user may therefore exist; entitlement logic must consistently select the correct current record and handle duplicate active subscriptions.
- Required `provider_subscription_id` is consistent with Stripe subscription synchronization.

### payment_events
- Unique: `provider_event_id`.
- Primary key: `id`.
- Processing status check: received, processed, failed, ignored.
- Status/time index: `(processing_status, created_at)`.
- Business reference nullable, ON DELETE SET NULL.
- This unique event ID protects the event log from duplicate rows, but it does not itself prevent the webhook from repeating side effects before attempting the insert.

### business_subscriptions
- Separate business-level billing table, not updated by the currently inspected user Basic/Pro checkout webhook.
- Unique Stripe `provider_subscription_id`.
- Business FK cascades on business deletion; plan FK references `monetization_plans(code)`.
- Status: pending, trialing, active, past_due, canceled, incomplete, unpaid.
- Billing interval: month/year.
- Provider restricted to Stripe.
- Indexes on business_id, plan_code, and status.

## Integration finding
The current Checkout Function creates user-level Basic/Pro subscriptions and correctly places `user_id` + `plan` in both Checkout Session metadata and Subscription metadata. The webhook synchronizes these into `user_subscriptions`. It does not currently synchronize `business_subscriptions`. Treat business subscriptions as a distinct product flow until a separately verified implementation exists.

## Important webhook issue
The webhook applies subscription updates before inserting the event ID into `payment_events`. Duplicate event delivery can therefore repeat writes, and out-of-order events can potentially overwrite newer subscription state. The unique event constraint alone is not a full idempotency/ordering strategy. This should be fixed and tested in staging before a production deployment is considered.

## Staging isolation status
- Staging project `lzcyulncvjjxsyyivlty` is healthy but has **zero public base tables**.
- Staging migration history is empty.
- No billing schema, Stripe test secrets, or disposable accounts are configured there yet.
- No production records, auth users, photos, Stripe secrets, or live payment settings were copied.
- No migrations were applied in this checkpoint.

## Next safe sequence
1. Recover and validate complete schema baseline and missing migration history; do not fabricate migration SQL.
2. Recreate schema and privileges in staging only, with explicit review before applying.
3. Configure only Stripe test-mode credentials and staging-specific webhook secret/endpoint.
4. Add disposable staging users and test catalog fixtures.
5. Test checkout, duplicate webhook delivery, out-of-order events, failed/recovered invoice, cancellation, and access revocation.
6. Verify user subscription and business subscription flows separately.
7. Only after staging evidence and review, propose a production hardening patch; no production deployment without explicit approval.

## Safety statement
Production is unchanged. No live Stripe setting, price, payout, webhook destination, user account, subscription, business, review, photo, or record was modified.
