-- REPUTIX STAGING-ONLY BASELINE CANDIDATE
-- Generated from read-only production catalogs on 2026-11-11.
-- TARGET: isolated staging project lzcyulncvjjxsyyivlty ONLY.
-- DO NOT APPLY TO PRODUCTION. DO NOT RUN UNTIL THE REVIEW GATES IN THE COMPANION
-- DOCUMENT ARE SIGNED OFF. This file intentionally does not copy any production data,
-- Auth users, Storage objects, Stripe secrets, or cron schedule.

BEGIN;
SET LOCAL search_path = public, extensions;

-- First remove broad future-object grants for the postgres role used by migrations.
-- Staging's current default ACLs are also broad for postgres. This does not modify
-- Supabase-managed supabase_admin defaults.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

-- 20 production public tables: columns, defaults, identity behavior, and nullability.
CREATE TABLE public.ad_campaigns (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  destination_url text,
  placement text DEFAULT 'business_carousel'::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  budget_cents integer DEFAULT 0 NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.ad_clicks (\n  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  campaign_id uuid NOT NULL,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  placement text\n);

CREATE TABLE public.ad_impressions (\n  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  campaign_id uuid NOT NULL,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  placement text\n);

CREATE TABLE public.business_conversations (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'open'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.business_messages (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  read_at timestamp with time zone\n);

CREATE TABLE public.business_monthly_history (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  month_start date NOT NULL,
  total_published_reviews integer DEFAULT 0 NOT NULL,
  avg_cleanliness numeric(3,2),
  avg_service_quality numeric(3,2),
  avg_product_quality numeric(3,2),
  avg_speed numeric(3,2),
  avg_value_for_money numeric(3,2),
  calculated_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.business_owner_claims (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  evidence_note text,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  relationship_type text DEFAULT 'owner'::text NOT NULL,
  verification_level text DEFAULT 'activity'::text NOT NULL,
  evidence_type text DEFAULT 'written_statement'::text NOT NULL,
  evidence_links text[] DEFAULT '{}'::text[] NOT NULL,
  reviewer_note text\n);

CREATE TABLE public.business_photos (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id text NOT NULL,
  storage_path text NOT NULL,
  original_filename text,
  content_type text,
  file_size bigint,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone\n);

CREATE TABLE public.business_promotions (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  promo_code text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  status text DEFAULT 'pending_review'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.business_subscriptions (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  plan_code text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  billing_interval text DEFAULT 'month'::text NOT NULL,
  provider text DEFAULT 'stripe'::text NOT NULL,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.business_verification_documents (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  document_type text DEFAULT 'address_proof'::text NOT NULL,
  storage_path text,
  original_filename text,
  content_type text,
  file_size bigint,
  status text DEFAULT 'awaiting_upload'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  review_note text\n);

CREATE TABLE public.businesses (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  description text,
  address text,
  category text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  phone text,
  hours text,
  city text,
  zip text,
  instagram_url text,
  facebook_url text,
  tiktok_url text\n);

CREATE TABLE public.complaints (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  complaint text NOT NULL,
  original_language text,
  status text DEFAULT 'pending'::text NOT NULL,
  business_response text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_id uuid\n);

CREATE TABLE public.monetization_plans (\n  code text NOT NULL,
  name text NOT NULL,
  monthly_price_cents integer NOT NULL,
  currency text DEFAULT 'usd'::text NOT NULL,
  description text,
  features jsonb DEFAULT '[]'::jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.payment_events (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  provider text DEFAULT 'stripe'::text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  business_id uuid,
  processed_at timestamp with time zone,
  processing_status text DEFAULT 'received'::text NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.review_ai_moderation (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  review_id uuid NOT NULL,
  outcome text NOT NULL,
  reasons text[] DEFAULT '{}'::text[] NOT NULL,
  confidence numeric(4,3),
  model text,
  created_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.reviews (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  visit_date date DEFAULT CURRENT_DATE NOT NULL,
  visit_time time without time zone NOT NULL,
  cleanliness integer,
  service_quality integer,
  product_quality integer,
  speed integer,
  value_for_money integer,
  comment text,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  original_language text,
  translated_comment text,
  translated_language text,
  staff_name text,
  user_id uuid\n);

CREATE TABLE public.user_profiles (\n  user_id uuid NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.user_publications (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'published'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL\n);

CREATE TABLE public.user_subscriptions (\n  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  plan_code text NOT NULL,
  status text DEFAULT 'incomplete'::text NOT NULL,
  provider text DEFAULT 'stripe'::text NOT NULL,
  provider_customer_id text,
  provider_subscription_id text NOT NULL,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL\n);

ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_placement_check CHECK (placement = ANY (ARRAY['business_carousel'::text, 'discovery_feed'::text, 'category_featured'::text]));

ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_budget_cents_check CHECK (budget_cents >= 0);

ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);

ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_description_check CHECK (description IS NULL OR char_length(description) <= 1000);

ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_title_check CHECK (char_length(btrim(title)) >= 3 AND char_length(btrim(title)) <= 120);

ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_status_check CHECK (status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'active'::text, 'paused'::text, 'completed'::text, 'rejected'::text]));

ALTER TABLE public.ad_campaigns ADD CONSTRAINT ad_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE public.ad_clicks ADD CONSTRAINT ad_clicks_pkey PRIMARY KEY (id);

ALTER TABLE public.ad_clicks ADD CONSTRAINT ad_clicks_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.ad_impressions ADD CONSTRAINT ad_impressions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.ad_impressions ADD CONSTRAINT ad_impressions_pkey PRIMARY KEY (id);

ALTER TABLE public.business_conversations ADD CONSTRAINT business_conversations_status_check CHECK (status = ANY (ARRAY['open'::text, 'closed'::text]));

ALTER TABLE public.business_conversations ADD CONSTRAINT business_conversations_subject_check CHECK (char_length(btrim(subject)) >= 1 AND char_length(btrim(subject)) <= 160);

ALTER TABLE public.business_conversations ADD CONSTRAINT business_conversations_business_id_customer_id_subject_key UNIQUE (business_id, customer_id, subject);

ALTER TABLE public.business_conversations ADD CONSTRAINT business_conversations_pkey PRIMARY KEY (id);

ALTER TABLE public.business_conversations ADD CONSTRAINT business_conversations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.business_conversations ADD CONSTRAINT business_conversations_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_messages ADD CONSTRAINT business_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES business_conversations(id) ON DELETE CASCADE;

ALTER TABLE public.business_messages ADD CONSTRAINT business_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.business_messages ADD CONSTRAINT business_messages_body_check CHECK (char_length(btrim(body)) >= 1 AND char_length(btrim(body)) <= 5000);

ALTER TABLE public.business_messages ADD CONSTRAINT business_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.business_monthly_history ADD CONSTRAINT business_monthly_history_business_id_month_start_key UNIQUE (business_id, month_start);

ALTER TABLE public.business_monthly_history ADD CONSTRAINT business_monthly_history_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_monthly_history ADD CONSTRAINT business_monthly_history_total_published_reviews_check CHECK (total_published_reviews >= 0);

ALTER TABLE public.business_monthly_history ADD CONSTRAINT business_monthly_history_pkey PRIMARY KEY (id);

ALTER TABLE public.business_owner_claims ADD CONSTRAINT business_owner_claims_business_id_user_id_key UNIQUE (business_id, user_id);

ALTER TABLE public.business_owner_claims ADD CONSTRAINT business_owner_claims_verification_level_check CHECK (verification_level = ANY (ARRAY['activity'::text, 'business_responsible'::text, 'owner'::text]));

ALTER TABLE public.business_owner_claims ADD CONSTRAINT business_owner_claims_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_owner_claims ADD CONSTRAINT business_owner_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.business_owner_claims ADD CONSTRAINT business_owner_claims_evidence_type_check CHECK (evidence_type = ANY (ARRAY['work_photos'::text, 'customer_references'::text, 'business_social'::text, 'phone_or_email'::text, 'storefront_photos'::text, 'business_documents'::text, 'written_statement'::text, 'multiple'::text]));

ALTER TABLE public.business_owner_claims ADD CONSTRAINT business_owner_claims_pkey PRIMARY KEY (id);

ALTER TABLE public.business_owner_claims ADD CONSTRAINT business_owner_claims_relationship_type_check CHECK (relationship_type = ANY (ARRAY['owner'::text, 'partner'::text, 'manager'::text, 'independent_worker'::text, 'new_entrepreneur'::text]));

ALTER TABLE public.business_owner_claims ADD CONSTRAINT business_owner_claims_status_check CHECK (status = ANY (ARRAY['pending'::text, 'activity_verified'::text, 'responsible_verified'::text, 'verified'::text, 'rejected'::text]));

ALTER TABLE public.business_photos ADD CONSTRAINT business_photos_storage_path_key UNIQUE (storage_path);

ALTER TABLE public.business_photos ADD CONSTRAINT business_photos_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));

ALTER TABLE public.business_photos ADD CONSTRAINT business_photos_pkey PRIMARY KEY (id);

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_description_check CHECK (description IS NULL OR char_length(description) <= 1000);

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_pkey PRIMARY KEY (id);

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_status_check CHECK (status = ANY (ARRAY['draft'::text, 'pending_review'::text, 'approved'::text, 'active'::text, 'expired'::text, 'rejected'::text]));

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_title_check CHECK (char_length(btrim(title)) >= 3 AND char_length(btrim(title)) <= 120);

ALTER TABLE public.business_subscriptions ADD CONSTRAINT business_subscriptions_billing_interval_check CHECK (billing_interval = ANY (ARRAY['month'::text, 'year'::text]));

ALTER TABLE public.business_subscriptions ADD CONSTRAINT business_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.business_subscriptions ADD CONSTRAINT business_subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_subscriptions ADD CONSTRAINT business_subscriptions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text, 'unpaid'::text]));

ALTER TABLE public.business_subscriptions ADD CONSTRAINT business_subscriptions_plan_code_fkey FOREIGN KEY (plan_code) REFERENCES monetization_plans(code);

ALTER TABLE public.business_subscriptions ADD CONSTRAINT business_subscriptions_provider_check CHECK (provider = 'stripe'::text);

ALTER TABLE public.business_subscriptions ADD CONSTRAINT business_subscriptions_provider_subscription_id_key UNIQUE (provider_subscription_id);

ALTER TABLE public.business_verification_documents ADD CONSTRAINT business_verification_documents_storage_path_key UNIQUE (storage_path);

ALTER TABLE public.business_verification_documents ADD CONSTRAINT business_verification_documents_pkey PRIMARY KEY (id);

ALTER TABLE public.business_verification_documents ADD CONSTRAINT business_verification_documents_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_verification_documents ADD CONSTRAINT business_verification_documents_status_check CHECK (status = ANY (ARRAY['awaiting_upload'::text, 'pending_review'::text, 'verified'::text, 'rejected'::text]));

ALTER TABLE public.businesses ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);

ALTER TABLE public.complaints ADD CONSTRAINT complaints_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;

ALTER TABLE public.complaints ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);

ALTER TABLE public.complaints ADD CONSTRAINT complaints_status_check CHECK (status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text, 'resolved'::text]));

ALTER TABLE public.complaints ADD CONSTRAINT complaints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.complaints ADD CONSTRAINT complaints_complaint_check CHECK (char_length(TRIM(BOTH FROM complaint)) >= 10 AND char_length(TRIM(BOTH FROM complaint)) <= 5000);

ALTER TABLE public.monetization_plans ADD CONSTRAINT monetization_plans_monthly_price_cents_check CHECK (monthly_price_cents >= 0);

ALTER TABLE public.monetization_plans ADD CONSTRAINT monetization_plans_currency_check CHECK (currency = 'usd'::text);

ALTER TABLE public.monetization_plans ADD CONSTRAINT monetization_plans_pkey PRIMARY KEY (code);

ALTER TABLE public.payment_events ADD CONSTRAINT payment_events_processing_status_check CHECK (processing_status = ANY (ARRAY['received'::text, 'processed'::text, 'failed'::text, 'ignored'::text]));

ALTER TABLE public.payment_events ADD CONSTRAINT payment_events_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.payment_events ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);

ALTER TABLE public.payment_events ADD CONSTRAINT payment_events_provider_event_id_key UNIQUE (provider_event_id);

ALTER TABLE public.review_ai_moderation ADD CONSTRAINT review_ai_moderation_outcome_check CHECK (outcome = ANY (ARRAY['clear'::text, 'needs_review'::text, 'high_risk'::text, 'unavailable'::text]));

ALTER TABLE public.review_ai_moderation ADD CONSTRAINT review_ai_moderation_pkey PRIMARY KEY (id);

ALTER TABLE public.review_ai_moderation ADD CONSTRAINT review_ai_moderation_review_id_fkey FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;

ALTER TABLE public.review_ai_moderation ADD CONSTRAINT review_ai_moderation_review_id_key UNIQUE (review_id);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_product_quality_check CHECK (product_quality >= 1 AND product_quality <= 5);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_cleanliness_check CHECK (cleanliness >= 1 AND cleanliness <= 5);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ADD CONSTRAINT reviews_status_check CHECK (status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text]));

ALTER TABLE public.reviews ADD CONSTRAINT reviews_speed_check CHECK (speed >= 1 AND speed <= 5);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_service_quality_check CHECK (service_quality >= 1 AND service_quality <= 5);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_value_for_money_check CHECK (value_for_money >= 1 AND value_for_money <= 5);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_bio_check CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE public.user_publications ADD CONSTRAINT user_publications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_publications ADD CONSTRAINT user_publications_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'hidden'::text]));

ALTER TABLE public.user_publications ADD CONSTRAINT user_publications_pkey PRIMARY KEY (id);

ALTER TABLE public.user_publications ADD CONSTRAINT user_publications_body_check CHECK (char_length(btrim(body)) >= 1 AND char_length(btrim(body)) <= 5000);

ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_plan_code_fkey FOREIGN KEY (plan_code) REFERENCES monetization_plans(code);

ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_provider_check CHECK (provider = 'stripe'::text);

ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_provider_subscription_id_key UNIQUE (provider_subscription_id);

ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_status_check CHECK (status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text, 'unpaid'::text, 'paused'::text]));

ALTER TABLE public.user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX ad_campaigns_business_idx ON public.ad_campaigns USING btree (business_id);

CREATE INDEX ad_campaigns_active_idx ON public.ad_campaigns USING btree (status, starts_at, ends_at);

CREATE INDEX ad_clicks_campaign_time_idx ON public.ad_clicks USING btree (campaign_id, occurred_at);

CREATE INDEX ad_impressions_campaign_time_idx ON public.ad_impressions USING btree (campaign_id, occurred_at);

CREATE INDEX business_conversations_business_idx ON public.business_conversations USING btree (business_id, updated_at DESC);

CREATE INDEX business_conversations_customer_idx ON public.business_conversations USING btree (customer_id, updated_at DESC);

CREATE INDEX business_messages_conversation_idx ON public.business_messages USING btree (conversation_id, created_at);

CREATE INDEX idx_business_monthly_history_business_month ON public.business_monthly_history USING btree (business_id, month_start DESC);

CREATE UNIQUE INDEX one_verified_owner_per_business ON public.business_owner_claims USING btree (business_id) WHERE (status = 'verified'::text);

CREATE INDEX business_promotions_active_idx ON public.business_promotions USING btree (status, starts_at, ends_at);

CREATE INDEX business_promotions_business_idx ON public.business_promotions USING btree (business_id);

CREATE INDEX business_subscriptions_business_idx ON public.business_subscriptions USING btree (business_id);

CREATE INDEX business_subscriptions_plan_code_idx ON public.business_subscriptions USING btree (plan_code);

CREATE INDEX business_subscriptions_status_idx ON public.business_subscriptions USING btree (status);

CREATE UNIQUE INDEX businesses_active_proposal_unique ON public.businesses USING btree (lower(btrim(name)), lower(btrim(category)), lower(btrim(city)), COALESCE(lower(btrim(address)), ''::text)) WHERE (status = ANY (ARRAY['pending'::text, 'approved'::text]));

CREATE INDEX complaints_user_created_idx ON public.complaints USING btree (user_id, created_at DESC);

CREATE INDEX complaints_business_created_idx ON public.complaints USING btree (business_id, created_at DESC);

CREATE INDEX payment_events_business_idx ON public.payment_events USING btree (business_id);

CREATE INDEX payment_events_status_idx ON public.payment_events USING btree (processing_status, created_at);

CREATE INDEX reviews_status_visit_date_idx ON public.reviews USING btree (status, visit_date DESC);

CREATE INDEX reviews_user_created_idx ON public.reviews USING btree (user_id, created_at DESC);

CREATE INDEX reviews_published_business_time_idx ON public.reviews USING btree (business_id, visit_time) WHERE (status = 'published'::text);

CREATE INDEX reviews_business_visit_date_idx ON public.reviews USING btree (business_id, visit_date DESC);

CREATE INDEX reviews_published_visit_date_idx ON public.reviews USING btree (visit_date, business_id) WHERE (status = 'published'::text);

CREATE INDEX user_publications_user_created_idx ON public.user_publications USING btree (user_id, created_at DESC);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_monthly_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_owner_claims ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_photos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_promotions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_verification_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.monetization_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.review_ai_moderation ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_publications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 93 constraints, 25 non-constraint indexes (29 PK/UNIQUE indexes are created by constraints).




-- Enable RLS on all 20 base tables before any data is added.


-- Five routines. Exact production definitions and security attributes are retained.
CREATE OR REPLACE FUNCTION public.is_reputix_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'reputix_role') = 'admin',
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.owner_respond_to_complaint(p_complaint_id uuid, p_response text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para responder.';
  end if;
  if p_response is null or char_length(btrim(p_response)) < 3 or char_length(p_response) > 3000 then
    raise exception 'La respuesta debe tener entre 3 y 3000 caracteres.';
  end if;
  update public.complaints c
  set business_response = btrim(p_response), updated_at = now()
  where c.id = p_complaint_id
    and exists (
      select 1 from public.business_owner_claims oc
      where oc.business_id = c.business_id
        and oc.user_id = auth.uid()
        and oc.status = 'verified'
    );
  if not found then
    raise exception 'No tienes autorización para responder este reclamo o no existe.';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_business_monthly_history(p_month date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.business_monthly_history (
    business_id,
    month_start,
    total_published_reviews,
    avg_cleanliness,
    avg_service_quality,
    avg_product_quality,
    avg_speed,
    avg_value_for_money,
    calculated_at
  )
  SELECT
    r.business_id,
    date_trunc('month', r.visit_date)::date,
    COUNT(*)::integer,
    ROUND(AVG(r.cleanliness)::numeric, 2),
    ROUND(AVG(r.service_quality)::numeric, 2),
    ROUND(AVG(r.product_quality)::numeric, 2),
    ROUND(AVG(r.speed)::numeric, 2),
    ROUND(AVG(r.value_for_money)::numeric, 2),
    now()
  FROM public.reviews AS r
  WHERE r.status = 'published'
    AND r.visit_date >= date_trunc('month', p_month)::date
    AND r.visit_date < (
      date_trunc('month', p_month) + interval '1 month'
    )::date
  GROUP BY
    r.business_id,
    date_trunc('month', r.visit_date)::date
  ON CONFLICT (business_id, month_start)
  DO UPDATE SET
    total_published_reviews = EXCLUDED.total_published_reviews,
    avg_cleanliness = EXCLUDED.avg_cleanliness,
    avg_service_quality = EXCLUDED.avg_service_quality,
    avg_product_quality = EXCLUDED.avg_product_quality,
    avg_speed = EXCLUDED.avg_speed,
    avg_value_for_money = EXCLUDED.avg_value_for_money,
    calculated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.reputix_publish_valid_reviews()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  published_count integer;
BEGIN
  UPDATE public.reviews AS r
  SET status = 'published'
  WHERE r.status = 'pending'
    AND r.created_at <= now() - interval '24 hours'
    AND EXISTS (
      SELECT 1
      FROM public.businesses AS b
      WHERE b.id::text = r.business_id::text
        AND b.status = 'approved'
    )
    AND (
      NULLIF(trim(COALESCE(r.comment, '')), '') IS NOT NULL
      OR r.cleanliness BETWEEN 1 AND 5
      OR r.service_quality BETWEEN 1 AND 5
      OR r.product_quality BETWEEN 1 AND 5
      OR r.speed BETWEEN 1 AND 5
      OR r.value_for_money BETWEEN 1 AND 5
    )
    AND (
      r.cleanliness IS NULL OR r.cleanliness BETWEEN 1 AND 5
    )
    AND (
      r.service_quality IS NULL OR r.service_quality BETWEEN 1 AND 5
    )
    AND (
      r.product_quality IS NULL OR r.product_quality BETWEEN 1 AND 5
    )
    AND (
      r.speed IS NULL OR r.speed BETWEEN 1 AND 5
    )
    AND (
      r.value_for_money IS NULL OR r.value_for_money BETWEEN 1 AND 5
    );

  GET DIAGNOSTICS published_count = ROW_COUNT;
  RETURN published_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_business_proposal(p_name text, p_category text, p_address text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_zip text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_hours text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_instagram_url text DEFAULT NULL::text, p_facebook_url text DEFAULT NULL::text, p_tiktok_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  new_business_id uuid;
BEGIN
  IF nullif(pg_catalog.btrim(coalesce(p_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;
  IF nullif(pg_catalog.btrim(coalesce(p_category, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Business category is required';
  END IF;
  IF nullif(pg_catalog.btrim(coalesce(p_city, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Business city is required';
  END IF;
  IF pg_catalog.char_length(p_name) > 120
     OR pg_catalog.char_length(p_category) > 250
     OR pg_catalog.char_length(coalesce(p_address, '')) > 300
     OR pg_catalog.char_length(coalesce(p_city, '')) > 120
     OR pg_catalog.char_length(coalesce(p_zip, '')) > 20
     OR pg_catalog.char_length(coalesce(p_phone, '')) > 40
     OR pg_catalog.char_length(coalesce(p_hours, '')) > 250
     OR pg_catalog.char_length(coalesce(p_description, '')) > 2000
     OR pg_catalog.char_length(coalesce(p_instagram_url, '')) > 300
     OR pg_catalog.char_length(coalesce(p_facebook_url, '')) > 300
     OR pg_catalog.char_length(coalesce(p_tiktok_url, '')) > 300 THEN
    RAISE EXCEPTION 'One or more business fields exceed the allowed length';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.status IN ('pending', 'approved')
      AND lower(btrim(b.name)) = lower(btrim(p_name))
      AND lower(btrim(b.category)) = lower(btrim(p_category))
      AND lower(btrim(b.city)) = lower(btrim(p_city))
      AND coalesce(lower(btrim(b.address)), '') =
          coalesce(lower(btrim(p_address)), '')
  ) THEN
    RAISE EXCEPTION 'A matching business proposal already exists and is pending or approved';
  END IF;

  INSERT INTO public.businesses
    (name, category, address, city, zip, phone, hours, description,
     instagram_url, facebook_url, tiktok_url, status)
  VALUES
    (pg_catalog.btrim(p_name), pg_catalog.btrim(p_category),
     nullif(pg_catalog.btrim(coalesce(p_address, '')), ''),
     pg_catalog.btrim(p_city),
     nullif(pg_catalog.btrim(coalesce(p_zip, '')), ''),
     nullif(pg_catalog.btrim(coalesce(p_phone, '')), ''),
     nullif(pg_catalog.btrim(coalesce(p_hours, '')), ''),
     nullif(pg_catalog.btrim(coalesce(p_description, '')), ''),
     nullif(pg_catalog.btrim(coalesce(p_instagram_url, '')), ''),
     nullif(pg_catalog.btrim(coalesce(p_facebook_url, '')), ''),
     nullif(pg_catalog.btrim(coalesce(p_tiktok_url, '')), ''),
     'pending')
  RETURNING id INTO new_business_id;

  RETURN new_business_id;
END;
$function$;

-- Five views. All are created as SECURITY INVOKER in this staging candidate.
-- The two owner views are intentionally changed from production's definer behavior;
-- validate their required grants and two-owner isolation before considering release.
CREATE OR REPLACE VIEW public.business_hourly_patterns WITH (security_invoker=true) AS
SELECT business_id,
    EXTRACT(hour FROM visit_time)::integer AS visit_hour,
    count(*)::integer AS review_count,
    round(avg((cleanliness + service_quality + product_quality + speed + value_for_money)::numeric / 5::numeric), 2) AS average_score,
    round(avg(speed), 2) AS average_speed,
    round(avg(service_quality), 2) AS average_service_quality,
    round(avg(cleanliness), 2) AS average_cleanliness
   FROM reviews r
  WHERE status = 'published'::text AND visit_time IS NOT NULL
  GROUP BY business_id, (EXTRACT(hour FROM visit_time))
 HAVING count(*) >= 5;

CREATE OR REPLACE VIEW public.owner_business_dashboard WITH (security_invoker=true) AS
SELECT b.id AS business_id,
    b.name AS business_name,
    b.category,
    b.city,
    count(r.id)::integer AS published_reviews,
    round(avg((r.cleanliness + r.service_quality + r.product_quality + r.speed + r.value_for_money)::numeric / 5::numeric), 2) AS average_score,
    round(avg(r.cleanliness), 2) AS average_cleanliness,
    round(avg(r.service_quality), 2) AS average_service_quality,
    round(avg(r.product_quality), 2) AS average_product_quality,
    round(avg(r.speed), 2) AS average_speed,
    round(avg(r.value_for_money), 2) AS average_value_for_money,
    count(r.id) FILTER (WHERE r.visit_date >= (CURRENT_DATE - 7))::integer AS reviews_last_7_days
   FROM business_owner_claims c
     JOIN businesses b ON b.id = c.business_id
     LEFT JOIN reviews r ON r.business_id = b.id AND r.status = 'published'::text
  WHERE c.user_id = (( SELECT auth.uid() AS uid)) AND c.status = 'verified'::text AND b.status = 'approved'::text AND (EXISTS ( SELECT 1
           FROM user_subscriptions s
          WHERE s.user_id = (( SELECT auth.uid() AS uid)) AND (s.plan_code = ANY (ARRAY['basic'::text, 'pro'::text])) AND (s.status = ANY (ARRAY['active'::text, 'trialing'::text])) AND (s.current_period_end IS NULL OR s.current_period_end > now())))
  GROUP BY b.id, b.name, b.category, b.city;

CREATE OR REPLACE VIEW public.owner_business_hourly_patterns WITH (security_invoker=true) AS
SELECT b.id AS business_id,
    EXTRACT(hour FROM r.visit_time)::integer AS visit_hour,
    count(*)::integer AS review_count,
    round(avg(r.service_quality), 2) AS average_service_quality,
    round(avg(r.speed), 2) AS average_speed,
    round(avg(r.cleanliness), 2) AS average_cleanliness,
    round(avg((r.cleanliness + r.service_quality + r.product_quality + r.speed + r.value_for_money)::numeric / 5::numeric), 2) AS average_score
   FROM business_owner_claims c
     JOIN businesses b ON b.id = c.business_id
     JOIN reviews r ON r.business_id = b.id AND r.status = 'published'::text
  WHERE c.user_id = (( SELECT auth.uid() AS uid)) AND c.status = 'verified'::text AND b.status = 'approved'::text AND r.visit_time IS NOT NULL AND (EXISTS ( SELECT 1
           FROM user_subscriptions s
          WHERE s.user_id = (( SELECT auth.uid() AS uid)) AND s.plan_code = 'pro'::text AND (s.status = ANY (ARRAY['active'::text, 'trialing'::text])) AND (s.current_period_end IS NULL OR s.current_period_end > now())))
  GROUP BY b.id, (EXTRACT(hour FROM r.visit_time))
 HAVING count(*) >= 3;

CREATE OR REPLACE VIEW public.recent_review_highlights WITH (security_invoker=true) AS
SELECT r.id AS review_id,
    b.id AS business_id,
    b.name AS business_name,
    r.visit_date,
    r.visit_time,
    round((r.cleanliness + r.service_quality + r.product_quality + r.speed + r.value_for_money)::numeric / 5::numeric, 1) AS average_score,
    "left"(COALESCE(r.comment, ''::text), 220) AS review_excerpt
   FROM reviews r
     JOIN businesses b ON b.id = r.business_id
  WHERE r.status = 'published'::text AND b.status = 'approved'::text AND r.created_at >= (now() - '30 days'::interval)
  ORDER BY r.created_at DESC;

CREATE OR REPLACE VIEW public.weekly_business_rankings WITH (security_invoker=true) AS
WITH current_week AS (
         SELECT date_trunc('week'::text, (now() AT TIME ZONE 'America/Los_Angeles'::text))::date AS week_start
        ), scores AS (
         SELECT b.id AS business_id,
            b.name AS business_name,
            b.category,
            b.city,
            w.week_start,
            count(r.id)::integer AS review_count,
            round(avg((r.cleanliness + r.service_quality + r.product_quality + r.speed + r.value_for_money)::numeric / 5::numeric), 2) AS average_score,
            count(r.id) FILTER (WHERE ((r.cleanliness + r.service_quality + r.product_quality + r.speed + r.value_for_money)::numeric / 5::numeric) >= 4::numeric)::integer AS positive_reviews
           FROM businesses b
             CROSS JOIN current_week w
             JOIN reviews r ON r.business_id = b.id
          WHERE b.status = 'approved'::text AND r.status = 'published'::text AND r.visit_date >= w.week_start AND r.visit_date < (w.week_start + 7)
          GROUP BY b.id, b.name, b.category, b.city, w.week_start
         HAVING count(r.id) >= 5
        )
 SELECT row_number() OVER (ORDER BY average_score DESC, positive_reviews DESC, review_count DESC, business_name)::integer AS weekly_rank,
    business_id,
    business_name,
    category,
    city,
    week_start,
    review_count,
    average_score,
    positive_reviews
   FROM scores;

-- Exact 35 PERMISSIVE public-schema RLS policies from the production catalog.
CREATE POLICY "Public can view active approved campaigns" ON public.ad_campaigns AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((status = 'active'::text) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at > now()))));

CREATE POLICY "Reputix admins manage ad campaigns" ON public.ad_campaigns AS PERMISSIVE FOR ALL TO authenticated USING (is_reputix_admin()) WITH CHECK (is_reputix_admin());

CREATE POLICY "Verified owners view their campaigns" ON public.ad_campaigns AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM business_owner_claims c
  WHERE ((c.business_id = ad_campaigns.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text)))));

CREATE POLICY "Reputix admins read ad clicks" ON public.ad_clicks AS PERMISSIVE FOR SELECT TO authenticated USING (is_reputix_admin());

CREATE POLICY "Reputix admins read ad impressions" ON public.ad_impressions AS PERMISSIVE FOR SELECT TO authenticated USING (is_reputix_admin());

CREATE POLICY "Customers start conversations with approved businesses" ON public.business_conversations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((customer_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_conversations.business_id) AND (b.status = 'approved'::text))))));

CREATE POLICY "Participants read business conversations" ON public.business_conversations AS PERMISSIVE FOR SELECT TO authenticated USING (((customer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM business_owner_claims c
  WHERE ((c.business_id = business_conversations.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text))))));

CREATE POLICY "Conversation participants read messages" ON public.business_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM business_conversations c
  WHERE ((c.id = business_messages.conversation_id) AND ((c.customer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_owner_claims claim
          WHERE ((claim.business_id = c.business_id) AND (claim.user_id = ( SELECT auth.uid() AS uid)) AND (claim.status = 'verified'::text)))))))));

CREATE POLICY "Conversation participants send messages" ON public.business_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM business_conversations c
  WHERE ((c.id = business_messages.conversation_id) AND ((c.customer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_owner_claims claim
          WHERE ((claim.business_id = c.business_id) AND (claim.user_id = ( SELECT auth.uid() AS uid)) AND (claim.status = 'verified'::text))))))))));

CREATE POLICY "Participants mark received messages read" ON public.business_messages AS PERMISSIVE FOR UPDATE TO authenticated USING (((sender_id <> ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM business_conversations c
  WHERE ((c.id = business_messages.conversation_id) AND ((c.customer_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_owner_claims claim
          WHERE ((claim.business_id = c.business_id) AND (claim.user_id = ( SELECT auth.uid() AS uid)) AND (claim.status = 'verified'::text)))))))))) WITH CHECK ((sender_id <> ( SELECT auth.uid() AS uid)));

CREATE POLICY "Owners can submit their own pending claims" ON public.business_owner_claims AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text)));

CREATE POLICY "Owners can view their own claims" ON public.business_owner_claims AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Reputix admins can review owner claims" ON public.business_owner_claims AS PERMISSIVE FOR SELECT TO authenticated USING (is_reputix_admin());

CREATE POLICY "Reputix admins can update owner claims" ON public.business_owner_claims AS PERMISSIVE FOR UPDATE TO authenticated USING (is_reputix_admin()) WITH CHECK ((is_reputix_admin() AND (status = ANY (ARRAY['pending'::text, 'activity_verified'::text, 'responsible_verified'::text, 'verified'::text, 'rejected'::text]))));

CREATE POLICY "Public can view approved business photos" ON public.business_photos AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((status = 'approved'::text));

CREATE POLICY "Users can submit pending business photos" ON public.business_photos AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK ((status = 'pending'::text));

CREATE POLICY "Public can view active promotions" ON public.business_promotions AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((status = 'active'::text) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at > now()))));

CREATE POLICY "Verified owners manage their promotions" ON public.business_promotions AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM business_owner_claims c
  WHERE ((c.business_id = business_promotions.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM business_owner_claims c
  WHERE ((c.business_id = business_promotions.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text)))));

CREATE POLICY "Verified owners view their business subscriptions" ON public.business_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM business_owner_claims c
  WHERE ((c.business_id = business_subscriptions.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text)))));

CREATE POLICY "Anyone can view approved businesses" ON public.businesses AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((status = 'approved'::text));

CREATE POLICY "Public can read published complaints" ON public.complaints AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((status = 'published'::text));

CREATE POLICY "Users can view their own complaints" ON public.complaints AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Verified owners can respond to complaints for their businesses" ON public.complaints AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (business_owner_claims c
     JOIN businesses b ON ((b.id = c.business_id)))
  WHERE ((c.business_id = complaints.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text) AND (b.status = 'approved'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (business_owner_claims c
     JOIN businesses b ON ((b.id = c.business_id)))
  WHERE ((c.business_id = complaints.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text) AND (b.status = 'approved'::text)))));

CREATE POLICY "Verified owners can view complaints for their businesses" ON public.complaints AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM business_owner_claims c
  WHERE ((c.business_id = complaints.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text)))));

CREATE POLICY "Visitors can submit pending complaints" ON public.complaints AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (((status = 'pending'::text) AND ((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Anyone can view active monetization plans" ON public.monetization_plans AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_active = true));

CREATE POLICY "Anyone can submit pending reviews" ON public.reviews AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (((status = 'pending'::text) AND ((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Anyone can view published reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((status = 'published'::text));

CREATE POLICY "Users can view their own reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Verified owners can view reviews for their businesses" ON public.reviews AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM business_owner_claims c
  WHERE ((c.business_id = reviews.business_id) AND (c.user_id = ( SELECT auth.uid() AS uid)) AND (c.status = 'verified'::text)))));

CREATE POLICY "Users can create their own profile" ON public.user_profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users can update their own profile" ON public.user_profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users can view their own profile" ON public.user_profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users manage their own publications" ON public.user_publications AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));

-- Explicit ACLs; broad default grants are revoked first. Includes scoped messaging
-- column grants and function EXECUTE grants from the production ACL inventory.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
