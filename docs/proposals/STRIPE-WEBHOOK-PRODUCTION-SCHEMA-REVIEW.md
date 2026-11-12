# Stripe webhook candidate — production schema and deployed handler review

Review date: 2026-11-12 11:48 a.m. Pacific
Status: read-only production review; candidate remains unmerged and unapplied.

## Exact production schema facts
- Production project: udvsrmfgjfinwbgvhchs. Only catalog metadata and plan rows were queried; no rows were inserted, updated, or deleted.
- payment_events has NOT NULL provider, provider_event_id, event_type, processing_status, created_at; nullable business_id, processed_at, error_message. processing_status CHECK is received | processed | failed | ignored.
- payment_events has a global UNIQUE(provider_event_id) constraint/index (not a composite provider+event key). The candidate's ON CONFLICT(provider_event_id) matches this current constraint.
- user_subscriptions has NOT NULL user_id, plan_code, status, provider, provider_subscription_id, cancel_at_period_end, created_at, updated_at; nullable provider_customer_id and current period timestamps.
- user_subscriptions has UNIQUE(provider_subscription_id), provider CHECK='stripe', plan_code FK to monetization_plans(code), and status CHECK limited to trialing | active | past_due | canceled | incomplete | unpaid | paused.
- Current monetization_plans rows include active Basic (1300 USD cents), Free (0), and Pro (2500). The candidate allows only basic/pro for Stripe-paid subscriptions, matching the intended paid plans.

## Deployed webhook v3 source review
- Retrieved active production Edge Function source read-only. Version 3 is ACTIVE with verify_jwt=false; handler validates Stripe-Signature against the raw request body before business processing.
- Current flow performs subscription retrieval and user_subscriptions upsert before inserting payment_events. Thus event recording is after side effects; duplicate-ignore on the event insert does not prevent duplicate business processing or out-of-order overwrites.
- Subscription events retrieve Stripe subscription data; checkout.session.completed can use Checkout Session metadata as fallback. Invoice events retrieve current subscription state.
- invoice.payment_failed currently mutates the in-memory retrieved subscription status from active to past_due before persisting it, even though Stripe's retrieved object still says active. This is a local synthetic override, not Stripe's authoritative subscription status; the product mapping decision must be explicitly resolved before integration.
- The current code sends Stripe subscription.status directly to user_subscriptions. Stripe's Subscription status enum also includes incomplete_expired, but the production database CHECK does not. Without an explicit mapping, that terminal Stripe status would cause the DB write to fail and the webhook to return 500/retry. Define a safe mapping (or schema change with entitlement review) before integration.
- Stripe's current API reference documents incomplete_expired as a terminal status after an initial invoice is not paid within 23 hours. Source: https://docs.stripe.com/api/subscriptions/object

## Candidate integration contract
1. Preserve the current raw-body signature verification and reject invalid signatures before any database writes.
2. Derive immutable event time from verified event.created (Unix seconds); never use delivery time or updated_at as the ordering key.
3. Claim event and apply subscription mutation through the same transaction/RPC. Return 2xx for duplicate, processed, and ignored; return 5xx for transaction failure so Stripe retries.
4. Keep current trusted metadata rules: require user_id and basic/pro; checkout completion may fall back to Checkout Session metadata, but later subscription/invoice events must use subscription metadata or a verified linkage lookup.
5. Before routing legacy subscriptions through the timestamp guard, reconcile them from Stripe's authoritative current subscription object. Rows with NULL event timestamps must remain quarantined until reconciled.
6. Decide the invoice.payment_failed product model: do not persist a synthetic past_due status while Stripe still reports active unless a separate explicit payment-issue state is designed and tested.
7. Add explicit mapping for incomplete_expired to an allowed terminal Reputix state (likely no paid entitlement) and test it; do not silently broaden the status constraint without reviewing all consumers.
8. Consider checking event.livemode against an explicit environment expectation, but do not read or change secrets or environment configuration as part of this review.

## Remaining gates
- Current candidate SQL is still isolated; no migration applied to production or staging.
- Full staging schema diff/advisors and Edge Function integration/raw-body signature tests remain outstanding.
- Validate event mapping and all plan/status values against current production and staging constraints before any deployment.
- No Stripe Dashboard change, checkout, test charge, webhook delivery, secret read, function deployment, or production data write was performed.