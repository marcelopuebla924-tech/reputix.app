-- REPUTIX STAGING-ONLY BASELINE CANDIDATE
-- Generated from read-only production catalogs on 2026-11-11.
-- TARGET: isolated staging project lzcyulncvjjxsyyivlty ONLY.
-- DO NOT APPLY TO PRODUCTION. Review companion document before use.

BEGIN;
SET LOCAL search_path = public, extensions;

-- Staging's postgres migration owner has broad default ACLs. Tighten only this
-- owner in the isolated staging project; do not alter Supabase-managed roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

-- 20 tables, including the two GENERATED ALWAYS identity columns.
undefined

-- 93 validated constraints.
undefined

-- 25 additional indexes; primary/unique indexes are created by constraints.
undefined

-- Enable RLS on all 20 public base tables.
undefined

-- Five exact production routines and security attributes.
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

-- Five views as SECURITY INVOKER in staging. Owner views are intentionally
-- hardened relative to production and require two-owner tests before sign-off.
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

-- Exact 35 permissive RLS policies.
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

-- Explicit ACL recreation; grants are not inherited from broad defaults.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.businesses TO anon;
GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.businesses TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.businesses TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_monthly_history TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.reviews TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.reviews TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.reviews TO service_role;
GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.complaints TO anon;
GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.complaints TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.complaints TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.weekly_business_rankings TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.weekly_business_rankings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.weekly_business_rankings TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_photos TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_photos TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_photos TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.recent_review_highlights TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.recent_review_highlights TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.recent_review_highlights TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_hourly_patterns TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_hourly_patterns TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_hourly_patterns TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_verification_documents TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.business_owner_claims TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_owner_claims TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_owner_claims TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_profiles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_profiles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_publications TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_publications TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_publications TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_conversations TO service_role;
GRANT SELECT ON TABLE public.business_conversations TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_messages TO service_role;
GRANT SELECT ON TABLE public.business_messages TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.owner_business_dashboard TO service_role;
GRANT SELECT ON TABLE public.owner_business_dashboard TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.owner_business_hourly_patterns TO service_role;
GRANT SELECT ON TABLE public.owner_business_hourly_patterns TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_promotions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_promotions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_promotions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.payment_events TO service_role;
GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.monetization_plans TO anon;
GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.monetization_plans TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.monetization_plans TO service_role;
GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.business_subscriptions TO anon;
GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.business_subscriptions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.business_subscriptions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.review_ai_moderation TO service_role;
GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.ad_campaigns TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ad_campaigns TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ad_campaigns TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ad_impressions TO service_role;
GRANT SELECT ON TABLE public.ad_impressions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ad_clicks TO service_role;
GRANT SELECT ON TABLE public.ad_clicks TO authenticated;
GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.user_subscriptions TO anon;
GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE public.user_subscriptions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_subscriptions TO service_role;
GRANT SELECT (id) ON TABLE public.reviews TO anon;
GRANT SELECT (id) ON TABLE public.reviews TO authenticated;
GRANT SELECT (business_id) ON TABLE public.reviews TO anon;
GRANT SELECT (business_id) ON TABLE public.reviews TO authenticated;
GRANT SELECT (visit_date) ON TABLE public.reviews TO anon;
GRANT SELECT (visit_date) ON TABLE public.reviews TO authenticated;
GRANT SELECT (visit_time) ON TABLE public.reviews TO anon;
GRANT SELECT (visit_time) ON TABLE public.reviews TO authenticated;
GRANT SELECT (cleanliness) ON TABLE public.reviews TO anon;
GRANT SELECT (cleanliness) ON TABLE public.reviews TO authenticated;
GRANT SELECT (service_quality) ON TABLE public.reviews TO anon;
GRANT SELECT (service_quality) ON TABLE public.reviews TO authenticated;
GRANT SELECT (product_quality) ON TABLE public.reviews TO anon;
GRANT SELECT (product_quality) ON TABLE public.reviews TO authenticated;
GRANT SELECT (speed) ON TABLE public.reviews TO anon;
GRANT SELECT (speed) ON TABLE public.reviews TO authenticated;
GRANT SELECT (value_for_money) ON TABLE public.reviews TO anon;
GRANT SELECT (value_for_money) ON TABLE public.reviews TO authenticated;
GRANT SELECT (comment) ON TABLE public.reviews TO anon;
GRANT SELECT (comment) ON TABLE public.reviews TO authenticated;
GRANT SELECT (status) ON TABLE public.reviews TO anon;
GRANT SELECT (status) ON TABLE public.reviews TO authenticated;
GRANT SELECT (created_at) ON TABLE public.reviews TO anon;
GRANT SELECT (created_at) ON TABLE public.reviews TO authenticated;
GRANT SELECT (original_language) ON TABLE public.reviews TO anon;
GRANT SELECT (original_language) ON TABLE public.reviews TO authenticated;
GRANT SELECT (translated_comment) ON TABLE public.reviews TO anon;
GRANT SELECT (translated_comment) ON TABLE public.reviews TO authenticated;
GRANT SELECT (translated_language) ON TABLE public.reviews TO anon;
GRANT SELECT (translated_language) ON TABLE public.reviews TO authenticated;
GRANT UPDATE (status) ON TABLE public.complaints TO authenticated;
GRANT UPDATE (business_response) ON TABLE public.complaints TO authenticated;
GRANT UPDATE (updated_at) ON TABLE public.complaints TO authenticated;
GRANT UPDATE (status) ON TABLE public.business_owner_claims TO authenticated;
GRANT UPDATE (reviewed_at) ON TABLE public.business_owner_claims TO authenticated;
GRANT INSERT (business_id) ON TABLE public.business_conversations TO authenticated;
GRANT INSERT (customer_id) ON TABLE public.business_conversations TO authenticated;
GRANT INSERT (subject) ON TABLE public.business_conversations TO authenticated;
GRANT INSERT (status) ON TABLE public.business_conversations TO authenticated;
GRANT INSERT (conversation_id) ON TABLE public.business_messages TO authenticated;
GRANT INSERT (sender_id) ON TABLE public.business_messages TO authenticated;
GRANT INSERT (body) ON TABLE public.business_messages TO authenticated;
GRANT UPDATE (read_at) ON TABLE public.business_messages TO authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_business_monthly_history(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.reputix_publish_valid_reviews() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_reputix_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_reputix_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reputix_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.owner_respond_to_complaint(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_respond_to_complaint(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_business_proposal(text, text, text, text, text, text, text, text, text, text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_business_proposal(text, text, text, text, text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_business_proposal(text, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_business_proposal(text, text, text, text, text, text, text, text, text, text, text) TO service_role;

COMMIT;
