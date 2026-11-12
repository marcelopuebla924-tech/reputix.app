# Reputix staging recovery — privileged objects and dependencies
**Date:** 2026-11-11  
**Time:** 8:55 p.m. Pacific (Los Angeles)  
**Production project:** `udvsrmfgjfinwbgvhchs`

## Scope and safety
Read-only inspection of production PostgreSQL metadata. No schema, row, Auth, Storage, Stripe, domain, or deployment changes. No secrets or production data copied to staging.

## Triggers and sequences
- `information_schema.triggers` returned no public-schema triggers.
- `information_schema.sequences` returned no standalone public-schema sequences. A later direct pg_attribute inspection confirmed `ad_clicks.id` and `ad_impressions.id` are GENERATED ALWAYS AS IDENTITY; PostgreSQL manages their internal identity sequences.
- This is a catalog observation, not proof that no internal platform-managed objects exist outside the public schema.

## Installed extensions
From Supabase's installed-extension inventory, installed versions were reported for:
- `plpgsql` 1.0 (pg_catalog)
- `supabase_vault` 0.3.1 (vault)
- `pg_cron` 1.6.4 (pg_catalog)
- `pg_stat_statements` 1.11 (extensions)
- `pgcrypto` 1.3 (extensions)
- `uuid-ossp` 1.1 (extensions)

The extension catalog also listed many available extensions with null installed_version; do not treat those as installed. Staging extension availability and schema placement must be verified before generating a baseline.

## Five public views — definition and access notes
- `business_hourly_patterns`: published reviews grouped by business and visit hour; exposes only groups with at least 5 reviews. Uses `security_invoker=true`.
- `owner_business_dashboard`: verified owner's approved business, published review totals/averages and last-7-day count; requires active/trialing Basic or Pro subscription. Uses owner execution context (security_invoker not set). Current grant hardening removes anon access; authenticated SELECT remains. Underlying row predicate checks `auth.uid()`, verified claim, approved business, and subscription.
- `owner_business_hourly_patterns`: verified owner's published hourly patterns; requires active/trialing Pro subscription and at least 3 reviews per hour. Uses owner execution context (security_invoker not set). Current grant hardening removes anon access; authenticated SELECT remains. Underlying predicate checks `auth.uid()` and verified claim.
- `recent_review_highlights`: approved business and published reviews from last 30 days, excerpt capped at 220 chars. Uses `security_invoker=true`.
- `weekly_business_rankings`: current Los Angeles-time week, approved businesses with at least 5 published reviews, ordered by average score, positive-review count, review count, then business name. Uses `security_invoker=true`.

The two owner views must be tested for cross-business isolation using two synthetic staging owners before any security_invoker or grant changes. Do not modify production view definitions during staging reconstruction.

## Five public routines — exact security attributes and ACLs
1. `is_reputix_admin() RETURNS boolean`
   - SECURITY INVOKER; STABLE; empty search_path.
   - Checks JWT `app_metadata.reputix_role = 'admin'`; null-safe false.
   - EXECUTE: postgres, anon, authenticated, service_role.
2. `owner_respond_to_complaint(p_complaint_id uuid, p_response text) RETURNS void`
   - SECURITY DEFINER; search_path=public.
   - Requires auth.uid(); response 3–3000 chars; updates only complaint linked to a verified claim for auth.uid(); raises if unauthorized/not found.
   - EXECUTE: postgres, authenticated, service_role; no anon.
   - Staging hardening candidate: empty search_path and schema-qualify auth calls, after behavior tests.
3. `refresh_business_monthly_history(p_month date DEFAULT current month) RETURNS void`
   - SECURITY INVOKER; empty search_path.
   - Aggregates published reviews for month and upserts monthly counts/averages.
   - EXECUTE: postgres, service_role only.
4. `reputix_publish_valid_reviews() RETURNS integer`
   - SECURITY DEFINER; search_path=public.
   - Publishes pending reviews older than 24 hours for approved businesses only when comment or a valid score exists and every supplied score is 1–5; returns rows updated.
   - EXECUTE: postgres, service_role only.
   - Staging hardening candidate: empty search_path and schema-qualified built-ins. Keep scheduled job disabled in staging unless a fixture-only test/cleanup plan exists.
5. `submit_business_proposal(p_name text, p_category text, p_address text, p_city text, p_zip text, p_phone text, p_hours text, p_description text, p_instagram_url text, p_facebook_url text, p_tiktok_url text) RETURNS uuid`
   - SECURITY DEFINER; empty search_path.
   - Validates required name/category/city and maximum lengths; blocks normalized duplicates in pending/approved state; inserts new business with status pending.
   - EXECUTE: PUBLIC, postgres, anon, authenticated, service_role. Public proposal submission appears intentional; retain pending status and add abuse/rate-limit testing in staging.
   - Duplicate race behavior must be tested against the matching partial unique index.

## Baseline blockers still open
- Complete effective table/view/routine grants and exact RLS expressions must be persisted and reconciled.
- Exact Storage bucket configuration and object policies must be preserved; verification documents remain private.
- Extension availability and schema placement must be compared with empty staging before any extension DDL.
- Cron job inventory and schedule must be recorded; do not enable the production publication schedule on staging.
- Historical migration source remains incomplete: production has 18 migration-history entries, but only one SQL migration is tracked in the repository. Do not fabricate missing historical files.
- A staging-only baseline may be generated only after the full object inventory, dependency order, and rollback/recovery review are complete.

## Current state
Staging remains empty and isolated. No DDL has been applied. Production remains unchanged.
