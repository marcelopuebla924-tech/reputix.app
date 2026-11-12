#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_CANDIDATE="$ROOT/docs/proposals/stripe-webhook-atomic-claim-candidate.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/tests/fixtures/stripe-webhook-postgres-fixture.sql" -f "$SQL_CANDIDATE"

call_rpc() {
  local event_id="$1" event_time="$2" status="$3" sub_id="$4"
  local event_type="${5:-customer.subscription.updated}" apply_subscription="${6:-true}"
  psql "$DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 -c "
    SELECT public.process_stripe_webhook_event(
      '$event_id',
      '$event_type',
      '$event_time'::timestamptz,
      $apply_subscription,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'basic',
      '$status',
      'cus_fixture',
      '$sub_id',
      '2026-11-01T00:00:00Z'::timestamptz,
      '2026-12-01T00:00:00Z'::timestamptz,
      false
    );"
}

# Two independent psql processes/connections claim the same event simultaneously.
call_rpc evt_parallel_claim 2026-11-12T18:00:00Z active sub_parallel > /tmp/claim-a.txt &
pid_a=$!
call_rpc evt_parallel_claim 2026-11-12T18:00:00Z active sub_parallel > /tmp/claim-b.txt &
pid_b=$!
wait "$pid_a"
wait "$pid_b"

processed="$(grep -hxc 'processed' /tmp/claim-a.txt /tmp/claim-b.txt | awk '{s+=$1} END{print s+0}')"
duplicate="$(grep -hxc 'duplicate' /tmp/claim-a.txt /tmp/claim-b.txt | awk '{s+=$1} END{print s+0}')"
[[ "$processed" -eq 1 && "$duplicate" -eq 1 ]] || { echo "Concurrent claim failed: $processed processed / $duplicate duplicate ($(cat /tmp/claim-a.txt /tmp/claim-b.txt))"; exit 1; }

# The RPC is a privileged internal endpoint: only service_role may execute it.
acl="$(psql "$DATABASE_URL" -X -A -t -c "select has_function_privilege('service_role', 'public.process_stripe_webhook_event(text,text,timestamptz,boolean,uuid,text,text,text,text,timestamptz,timestamptz,boolean)', 'EXECUTE') || ':' || has_function_privilege('anon', 'public.process_stripe_webhook_event(text,text,timestamptz,boolean,uuid,text,text,text,text,timestamptz,timestamptz,boolean)', 'EXECUTE') || ':' || has_function_privilege('authenticated', 'public.process_stripe_webhook_event(text,text,timestamptz,boolean,uuid,text,text,text,text,timestamptz,timestamptz,boolean)', 'EXECUTE')")"
[[ "$acl" == "true:false:false" ]] || { echo "Unexpected RPC execute grants: $acl"; exit 1; }

event_count="$(psql "$DATABASE_URL" -X -A -t -c "select count(*) from public.payment_events where provider_event_id='evt_parallel_claim'")"
[[ "$event_count" == "1" ]] || { echo "Expected one event row, got $event_count"; exit 1; }

# A newer event wins; a later-delivered older event is recorded but cannot regress state.
[[ "$(call_rpc evt_newer 2026-11-12T19:00:00Z canceled sub_order_test)" == "processed" ]]
[[ "$(call_rpc evt_older 2026-11-12T18:00:00Z active sub_order_test)" == "ignored" ]]
final_status="$(psql "$DATABASE_URL" -X -A -t -c "select status from public.user_subscriptions where provider_subscription_id='sub_order_test'")"
[[ "$final_status" == "canceled" ]] || { echo "Stale event regressed subscription to $final_status"; exit 1; }

# A subscription.deleted event must not be undone by a later-delivered stale update.
[[ "$(call_rpc evt_deleted 2026-11-12T21:00:00Z canceled sub_deleted_test customer.subscription.deleted)" == "processed" ]]
[[ "$(call_rpc evt_stale_after_delete 2026-11-12T20:00:00Z active sub_deleted_test customer.subscription.updated)" == "ignored" ]]
delete_status="$(psql "$DATABASE_URL" -X -A -t -c "select status from public.user_subscriptions where provider_subscription_id='sub_deleted_test'")"
[[ "$delete_status" == "canceled" ]] || { echo "Stale update reactivated deleted subscription: $delete_status"; exit 1; }

# Unknown event types are logged once as ignored, without a subscription write.
[[ "$(call_rpc evt_unknown 2026-11-12T22:00:00Z active sub_unused customer.unknown false)" == "ignored" ]]
unknown_status="$(psql "$DATABASE_URL" -X -A -t -c "select processing_status from public.payment_events where provider_event_id='evt_unknown'")"
[[ "$unknown_status" == "ignored" ]] || { echo "Unknown event was not recorded as ignored: $unknown_status"; exit 1; }

# Legacy rows with NULL event timestamps are quarantined until reconciled from Stripe.
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "
  INSERT INTO public.user_subscriptions (
    user_id, plan_code, status, provider, provider_subscription_id, provider_event_created_at
  ) VALUES (
    '11111111-1111-4111-8111-111111111111', 'basic', 'active', 'stripe', 'sub_legacy_null', NULL
  );"
[[ "$(call_rpc evt_legacy_old 2026-11-12T17:00:00Z canceled sub_legacy_null)" == "ignored" ]]
legacy_status="$(psql "$DATABASE_URL" -X -A -t -c "select status from public.user_subscriptions where provider_subscription_id='sub_legacy_null'")"
[[ "$legacy_status" == "active" ]] || { echo "Unreconciled legacy subscription was overwritten: $legacy_status"; exit 1; }

# Stripe's terminal incomplete_expired state is stored without granting access.
[[ "$(call_rpc evt_incomplete_expired 2026-11-12T23:00:00Z incomplete_expired sub_incomplete_expired)" == "processed" ]]
expired_status="$(psql "$DATABASE_URL" -X -A -t -c "select status from public.user_subscriptions where provider_subscription_id='sub_incomplete_expired'")"
[[ "$expired_status" == "incomplete_expired" ]] || { echo "Terminal Stripe status was not persisted: $expired_status"; exit 1; }

# Equal-second timestamps are deliberately not ordered and do not overwrite.
[[ "$(call_rpc evt_equal 2026-11-12T19:00:00Z active sub_order_test)" == "ignored" ]]
final_status="$(psql "$DATABASE_URL" -X -A -t -c "select status from public.user_subscriptions where provider_subscription_id='sub_order_test'")"
[[ "$final_status" == "canceled" ]] || { echo "Equal-timestamp event overwrote subscription"; exit 1; }

# Failure after claim must roll back the event row, allowing a retry with the same ID.
if call_rpc evt_rollback 2026-11-12T20:00:00Z active sub_rollback_test >/tmp/rollback.txt 2>&1; then
  echo "Expected the injected subscription failure to abort the RPC"
  exit 1
fi
rollback_count="$(psql "$DATABASE_URL" -X -A -t -c "select count(*) from public.payment_events where provider_event_id='evt_rollback'")"
[[ "$rollback_count" == "0" ]] || { echo "Failed transaction left event claim behind"; exit 1; }

# Sequential redelivery returns duplicate and does not create another event.
[[ "$(call_rpc evt_parallel_claim 2026-11-12T18:00:00Z active sub_parallel)" == "duplicate" ]]
echo "PASS: concurrent claims, stale/deleted/equal ordering, Stripe terminal status, unknown events, legacy quarantine, rollback/retry safety."
