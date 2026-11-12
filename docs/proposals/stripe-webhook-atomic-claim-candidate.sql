-- CANDIDATE ONLY — do not apply to staging or production yet.
-- Reviewed against Reputix-Staging's observed payment_events and user_subscriptions schema
-- on 2026-11-12. This file intentionally lives outside supabase/migrations until
-- the independent-session test harness and full review are complete.

BEGIN;

ALTER TABLE public.payment_events
  ADD COLUMN provider_event_created_at timestamptz;

ALTER TABLE public.user_subscriptions
  ADD COLUMN provider_event_created_at timestamptz;

CREATE OR REPLACE FUNCTION public.process_stripe_webhook_event(
  p_provider_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_apply_subscription boolean,
  p_user_id uuid DEFAULT NULL,
  p_plan_code text DEFAULT NULL,
  p_subscription_status text DEFAULT NULL,
  p_provider_customer_id text DEFAULT NULL,
  p_provider_subscription_id text DEFAULT NULL,
  p_current_period_start timestamptz DEFAULT NULL,
  p_current_period_end timestamptz DEFAULT NULL,
  p_cancel_at_period_end boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_event_row_id uuid;
  v_subscription_rows integer := 0;
  v_final_status text;
BEGIN
  IF p_provider_event_id IS NULL OR pg_catalog.length(pg_catalog.btrim(p_provider_event_id)) = 0 THEN
    RAISE EXCEPTION 'provider event id is required';
  END IF;
  IF p_event_type IS NULL OR pg_catalog.length(pg_catalog.btrim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'event type is required';
  END IF;
  IF p_event_created_at IS NULL THEN
    RAISE EXCEPTION 'Stripe event creation timestamp is required';
  END IF;

  INSERT INTO public.payment_events (
    provider,
    provider_event_id,
    event_type,
    provider_event_created_at,
    processing_status
  )
  VALUES (
    'stripe',
    p_provider_event_id,
    p_event_type,
    p_event_created_at,
    'received'
  )
  ON CONFLICT (provider_event_id) DO NOTHING
  RETURNING id INTO v_event_row_id;

  IF v_event_row_id IS NULL THEN
    RETURN 'duplicate';
  END IF;

  IF p_apply_subscription THEN
    IF p_user_id IS NULL
       OR p_plan_code NOT IN ('basic', 'pro')
       OR p_subscription_status NOT IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid', 'paused')
       OR p_provider_subscription_id IS NULL
       OR pg_catalog.length(pg_catalog.btrim(p_provider_subscription_id)) = 0 THEN
      RAISE EXCEPTION 'subscription payload is incomplete or invalid';
    END IF;

    INSERT INTO public.user_subscriptions (
      user_id,
      plan_code,
      status,
      provider,
      provider_customer_id,
      provider_subscription_id,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      provider_event_created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      p_plan_code,
      p_subscription_status,
      'stripe',
      p_provider_customer_id,
      p_provider_subscription_id,
      p_current_period_start,
      p_current_period_end,
      pg_catalog.coalesce(p_cancel_at_period_end, false),
      p_event_created_at,
      pg_catalog.now()
    )
    ON CONFLICT (provider_subscription_id) DO UPDATE
    SET
      user_id = EXCLUDED.user_id,
      plan_code = EXCLUDED.plan_code,
      status = EXCLUDED.status,
      provider_customer_id = EXCLUDED.provider_customer_id,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      provider_event_created_at = EXCLUDED.provider_event_created_at,
      updated_at = pg_catalog.now()
    WHERE public.user_subscriptions.provider_event_created_at IS NULL
       OR public.user_subscriptions.provider_event_created_at < EXCLUDED.provider_event_created_at;

    GET DIAGNOSTICS v_subscription_rows = ROW_COUNT;
    v_final_status := CASE WHEN v_subscription_rows = 1 THEN 'processed' ELSE 'ignored' END;
  ELSE
    v_final_status := 'ignored';
  END IF;

  UPDATE public.payment_events
  SET
    processing_status = v_final_status,
    processed_at = pg_catalog.now()
  WHERE id = v_event_row_id;

  RETURN v_final_status;
END;
$function$;

REVOKE ALL ON FUNCTION public.process_stripe_webhook_event(
  text, text, timestamptz, boolean, uuid, text, text, text, text, timestamptz, timestamptz, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_stripe_webhook_event(
  text, text, timestamptz, boolean, uuid, text, text, text, text, timestamptz, timestamptz, boolean
) TO service_role;

COMMIT;
