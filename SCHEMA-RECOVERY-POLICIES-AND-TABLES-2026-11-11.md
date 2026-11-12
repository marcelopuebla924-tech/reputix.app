# Reputix production schema inventory — continuation
Date: 2026-11-11 8:30 p.m. PST

## Work completed in this checkpoint
Read-only catalog extraction for:
- ad_campaigns, ad_clicks, ad_impressions, business_conversations, business_messages
- business_monthly_history, business_owner_claims, business_photos, business_promotions, business_verification_documents
- businesses, reviews, review_ai_moderation, user_profiles, user_publications
- complaints, monetization_plans, business_subscriptions, user_subscriptions, payment_events

No production writes were performed.

## Additional confirmed schema details

### complaints
Columns: id uuid PK default gen_random_uuid(); business_id uuid NOT NULL; complaint text NOT NULL; original_language nullable text; status text NOT NULL default pending; business_response nullable text; created_at/updated_at timestamptz NOT NULL default now(); user_id nullable uuid.
Constraints: complaint trimmed length 10–5000; status pending/published/rejected/resolved; business_id FK businesses(id) ON DELETE RESTRICT; user_id FK auth.users(id) ON DELETE SET NULL.
Indexes: PK; (business_id, created_at DESC); (user_id, created_at DESC).
Policies captured in exact policy inventory below.

### monetization_plans
Columns: code text PK; name text NOT NULL; monthly_price_cents integer NOT NULL; currency text NOT NULL default usd; description nullable text; features jsonb NOT NULL default []; is_active boolean NOT NULL default true; display_order integer NOT NULL default 0; created_at/updated_at timestamptz NOT NULL default now().
Checks: currency must be usd; monthly_price_cents >= 0.
Policy: anon/authenticated SELECT active plans.

### business_subscriptions
Columns: id uuid PK default gen_random_uuid(); business_id uuid NOT NULL; plan_code text NOT NULL; status text NOT NULL default pending; billing_interval text NOT NULL default month; provider text NOT NULL default stripe; provider_customer_id/provider_subscription_id nullable text; current_period_start/current_period_end nullable timestamptz; cancel_at_period_end boolean NOT NULL default false; created_at/updated_at timestamptz NOT NULL default now().
FK business_id -> businesses(id) ON DELETE CASCADE; plan_code -> monetization_plans(code).
Checks: billing_interval month/year; provider stripe; status pending/trialing/active/past_due/canceled/incomplete/unpaid.
Unique provider_subscription_id; indexes business_id, plan_code, status.
Policy: verified owners SELECT their business subscriptions.

### user_subscriptions
Columns: id uuid PK default gen_random_uuid(); user_id uuid NOT NULL; plan_code text NOT NULL; status text NOT NULL default incomplete; provider text NOT NULL default stripe; provider_customer_id nullable text; provider_subscription_id text NOT NULL; current_period_start/current_period_end nullable timestamptz; cancel_at_period_end boolean NOT NULL default false; created_at/updated_at timestamptz NOT NULL default now().
FK plan_code -> monetization_plans(code); user_id -> auth.users(id) ON DELETE CASCADE.
Checks: provider stripe; status trialing/active/past_due/canceled/incomplete/unpaid/paused.
Unique provider_subscription_id. Policy: users SELECT their own subscription.

### payment_events
Columns: id uuid PK default gen_random_uuid(); provider text NOT NULL default stripe; provider_event_id text NOT NULL; event_type text NOT NULL; business_id nullable uuid; processed_at nullable timestamptz; processing_status text NOT NULL default received; error_message nullable text; created_at timestamptz NOT NULL default now().
FK business_id -> businesses(id) ON DELETE SET NULL.
Check processing_status received/processed/failed/ignored. Unique provider_event_id; indexes business_id and (processing_status, created_at).
RLS enabled, no policies: service-side processing only unless a separately reviewed policy is explicitly justified.

### businesses
Columns: id uuid PK default gen_random_uuid(); name text NOT NULL; description/address/category nullable text; created_at timestamptz NOT NULL default now(); status text NOT NULL default pending; phone/hours/city/zip/instagram_url/facebook_url/tiktok_url nullable text.
Partial unique index businesses_active_proposal_unique across normalized name/category/city/address for pending/approved rows. Policy: public SELECT approved businesses.

### reviews
Columns: id uuid PK default gen_random_uuid(); business_id uuid NOT NULL; visit_date date NOT NULL default CURRENT_DATE; visit_time time NOT NULL; cleanliness/service_quality/product_quality/speed/value_for_money nullable integer; comment nullable text; status text NOT NULL default pending; created_at timestamptz NOT NULL default now(); original_language/translated_comment/translated_language/staff_name nullable text; user_id nullable uuid.
FK business_id -> businesses(id) ON DELETE CASCADE; user_id -> auth.users(id) ON DELETE SET NULL.
Checks: five score fields each 1–5; status pending/published/rejected.
Indexes: business+visit_date desc; published business+visit_time partial; published visit_date+business partial; status+visit_date desc; user+created_at desc.
Policies: pending insert for anon/authenticated; published select; own select; verified owner select.

### review_ai_moderation
Columns: id uuid PK default gen_random_uuid(); review_id uuid NOT NULL UNIQUE FK reviews(id) ON DELETE CASCADE; outcome text NOT NULL; reasons text[] NOT NULL default {}; confidence numeric nullable; model text nullable; created_at timestamptz NOT NULL default now().
Check outcome clear/needs_review/high_risk/unavailable.
RLS enabled, no policies: service-side audit only unless reviewed.

### user_profiles
Columns: user_id uuid PK/FK auth.users(id) ON DELETE CASCADE; display_name/bio/avatar_url nullable text; created_at/updated_at timestamptz NOT NULL default now().
Check bio <= 500 chars. Policies: own SELECT/INSERT/UPDATE.

### user_publications
Columns: id uuid PK default gen_random_uuid(); user_id uuid NOT NULL FK auth.users(id) ON DELETE CASCADE; body text NOT NULL; status text NOT NULL default published; created_at/updated_at timestamptz NOT NULL default now().
Checks: trimmed body 1–5000; status draft/published/hidden.
Indexes: user_id, created_at DESC. Policy: users manage own publications.

## Complete public RLS policy inventory captured
The catalog returned 35 policies:
- ad_campaigns: 3 (public active read; admin ALL; verified owner read)
- ad_clicks: 1 (admin read)
- ad_impressions: 1 (admin read)
- business_conversations: 2 (customer inserts for approved business; participants read)
- business_messages: 3 (participants read/send; participants mark received messages read)
- business_owner_claims: 4 (owner pending insert/read own; admins read/update)
- business_photos: 2 (public read approved; anon/auth insert pending)
- business_promotions: 2 (public active read; verified owner manage)
- business_subscriptions: 1 (verified owner read)
- businesses: 1 (public read approved)
- complaints: 5 (public published read; own read; verified owner respond/read; visitors insert pending)
- monetization_plans: 1 (active plans read)
- reviews: 4 (pending insert; published read; own read; verified owner read)
- user_profiles: 3 (own insert/update/read)
- user_publications: 1 (own ALL)
- user_subscriptions: 1 (own read)
Total: 35 policies across 16 tables.

## Security / staging decisions
- business_monthly_history, business_verification_documents, payment_events, review_ai_moderation have RLS enabled but no client policies; preserve server-only access unless evidence supports a narrow policy.
- Public review INSERT and business-photo INSERT policies allow anon; test abuse controls, validation, and rate limits in staging before production changes.
- Business photos business_id is text, has no FK, and storage_path is unique; don't alter without checking frontend and storage flow.
- Subscription tables use Stripe provider fields. Staging must use Stripe test mode and separate secrets; never copy live secrets or alter production live billing settings.
- Preserve the exact unique indexes and checks, including duplicate business proposals and one verified owner per business.
- Staging remains empty. No DDL applied. Production remains untouched.

## Next steps
1. Finish extraction for any remaining public tables (including any not yet documented in the previous inventory).
2. Audit exact effective grants for all views/routines and verify RLS interaction.
3. Confirm Storage bucket policies and Edge Function code paths, especially private verification documents and photo approval.
4. Recover historical migration SQL if possible; do not invent the 17 missing files.
5. Build a staging-only baseline only after the full schema is reconciled; do not run a speculative db push.
