# Reputix staging status — 2026-11-12

## Scope and safety

All checks in this report were read-only against the dedicated Supabase project `lzcyulncvjjxsyyivlty` (Reputix-Staging). No SQL writes, migrations, test identities, Storage objects, Stripe events, or Edge Function deployments were performed. Production project `udvsrmfgjfinwbgvhchs` was not queried or changed in this pass.

## Current verified staging state

Project metadata:
- Project name: Reputix-Staging
- Project ref: `lzcyulncvjjxsyyivlty`
- Region: `us-east-2`
- Status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.11

Migration history:
- `20261112050900 reputix_staging_baseline_20261111`
- `20261112050922 staging_fk_performance_indexes_20261111`
- `20261112050928 staging_storage_object_policies_20261111`

Read-only catalog summary:
- 20 public base tables
- 5 public views
- 35 public RLS policies
- RLS enabled on all 20 public base tables

This confirms that the older `STAGING-BASELINE-RECOVERY-2026-11-11.md` statement that staging had zero public tables and zero migration history is stale. The later baseline review and the current live staging catalogs agree that the baseline was applied. Update future recovery notes to this current state; do not replay the baseline.

## Stripe billing schema observed in staging

`payment_events` currently has:
- `provider` (text, default stripe)
- `provider_event_id` (text, unique)
- `event_type` (text)
- `business_id` (nullable UUID)
- `processed_at`
- `processing_status` constrained to received/processed/failed/ignored
- `error_message`
- `created_at`

`user_subscriptions` currently has:
- `user_id`, `plan_code`, `status`, `provider`
- `provider_customer_id`, `provider_subscription_id` (unique)
- `current_period_start`, `current_period_end`
- `cancel_at_period_end`, `created_at`, `updated_at`

There is no Stripe event creation timestamp column on either table, no last-applied provider event timestamp on subscriptions, and no public billing/Stripe RPC function in staging.

The existing unique `payment_events.provider_event_id` key is useful, but does not alone make side effects idempotent when the event row is inserted after the subscription update.

## Storage status

The `storage.objects` policies for the business photo proposal workflow exist in staging, but a read-only query of `storage.buckets` returned no buckets. The bucket and its privacy/MIME/size settings must be configured separately before any Storage integration test. Do not create or copy buckets automatically as part of webhook work.

## Staging Security Advisor observations

The staging advisor currently reports:
- Four RLS-enabled tables with no policies: business_monthly_history, business_verification_documents, payment_events, review_ai_moderation.
- Public/anon and authenticated execution of the SECURITY DEFINER proposal RPC.
- Authenticated execution of the SECURITY DEFINER owner complaint response RPC.

These findings mirror previously documented intentional/backend-only or application-specific decisions. Do not blindly add public policies or revoke proposal RPC access. They are separate review items and are not changed by this Stripe test work.

## Required Stripe test design

The next database change, if approved after review, should be a staging-only migration with:
1. `provider_event_created_at timestamptz` on `payment_events`.
2. `provider_event_created_at timestamptz` (or an equivalently named last-applied event timestamp) on `user_subscriptions`.
3. A narrowly scoped Postgres RPC callable only by `service_role`, which inserts/claims the event using the existing unique event ID, applies the subscription upsert only if the incoming event timestamp is newer, and marks the event processed/ignored in the same database transaction.
4. No read-then-write deduplication in Edge Function code.

A single Postgres function call is one transaction. A duplicate event that loses the unique insert must return a duplicate result without changing subscription state. If the subscription update fails, the transaction must roll back the event claim so Stripe can retry.

Stripe `event.created` is second-resolution. Events with equal timestamps cannot be reliably ordered by timestamp alone. The initial implementation should not overwrite an existing subscription snapshot for an equal timestamp; equal-time events should be reconciled from Stripe's authoritative current subscription object through a separately designed, bounded reconciliation path. Do not pretend lexicographic event IDs establish chronological order.

## Test matrix before any deployment

- Duplicate sequential delivery: one event row and one state change.
- Duplicate concurrent delivery from separate database sessions: exactly one claim and one state change.
- Newer event then older event: no state regression.
- Older event then newer event: state advances.
- Equal-timestamp events: no overwrite; reconciliation path is explicit.
- Subscription deleted then stale update: no accidental reactivation.
- Simulated exception after claim but before subscription update: full transaction rollback; retry succeeds.
- Unknown event type: logged as ignored once.
- Invoice paid/payment_failed mapping: explicit; no locally fabricated Stripe status.
- Signature tests: valid signed raw body accepted; missing/invalid signature rejected.
- Function privileges: anon/authenticated cannot execute; service_role can.
- No live Stripe mode, real payment methods, production customers, or production webhooks.

Concurrency must be tested with two independent Postgres sessions or a dedicated isolated integration harness; a single sequential SQL script is not sufficient.

## Release boundary

This report is documentation only. It does not modify staging schema, data, Storage, Auth, Edge Functions, Stripe settings, or production. Any migration must be reviewed against the live staging catalogs and applied only to staging after an isolated test plan is ready. Production deployment remains a separate explicit decision.
