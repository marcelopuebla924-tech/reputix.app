-- Disposable PostgreSQL fixture matching only the reviewed billing columns/constraints.
-- Used by CI service container; never run against a Supabase project.
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.monetization_plans (code text PRIMARY KEY);
INSERT INTO public.monetization_plans(code) VALUES ('basic'), ('pro');

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'stripe',
  provider_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  business_id uuid NULL,
  processed_at timestamptz NULL,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','processed','failed','ignored')),
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.monetization_plans(code),
  status text NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','paused')),
  provider text NOT NULL DEFAULT 'stripe' CHECK (provider = 'stripe'),
  provider_customer_id text NULL,
  provider_subscription_id text NOT NULL UNIQUE,
  current_period_start timestamptz NULL,
  current_period_end timestamptz NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO service_role;

INSERT INTO auth.users(id) VALUES ('11111111-1111-4111-8111-111111111111');

-- Force the first concurrent claimant to hold the unique-key insert open briefly,
-- ensuring the second independent connection overlaps the in-flight transaction.
CREATE FUNCTION public.test_delay_payment_event_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provider_event_id = 'evt_parallel_claim' THEN
    PERFORM pg_sleep(1);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER test_delay_payment_event_insert
BEFORE INSERT ON public.payment_events
FOR EACH ROW EXECUTE FUNCTION public.test_delay_payment_event_insert();

-- Simulate a failure after event claim but during subscription upsert.
CREATE FUNCTION public.test_fail_subscription_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provider_subscription_id = 'sub_rollback_test' THEN
    RAISE EXCEPTION 'intentional rollback test';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER test_fail_subscription_insert
BEFORE INSERT ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.test_fail_subscription_insert();
