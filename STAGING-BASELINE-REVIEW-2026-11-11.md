# Reputix staging baseline candidate — review required

**Generated:** 2026-11-11 (Los Angeles)  
**Source:** read-only PostgreSQL catalogs from production `udvsrmfgjfinwbgvhchs`.  
**Target:** isolated staging `lzcyulncvjjxsyyivlty` only.  
**Status:** candidate only; NOT applied.

## Reconciliation
- 20 public base tables; 93 validated constraints; 54 total indexes (29 PK/UNIQUE created by constraints, 25 additional indexes).
- 35 permissive RLS policies across 16 tables; 5 routines; 5 views.
- 0 public triggers and 0 public custom enum/domain types.
- `ad_clicks.id` and `ad_impressions.id` are `bigint GENERATED ALWAYS AS IDENTITY`; PostgreSQL manages their identity sequences.
- `business_photos.business_id` remains TEXT with no FK. Both partial/expression indexes are preserved.

## Staging-only security choices
- All five views are candidates for `security_invoker=true`. This hardens the two production owner views flagged by Security Advisor. Test the exact views as two synthetic owners; do not widen underlying grants if the invoker model fails.
- Tighten future default ACLs only for the staging `postgres` migration owner. Supabase-managed `supabase_admin` defaults are untouched.
- Recreate explicit production relation grants, column grants, routine EXECUTE grants, and all 35 RLS policies. Messaging remains column-scoped.
- Keep anonymous proposal RPC ACL as cataloged while abuse controls are evaluated; don't revoke it blindly.

## Excluded
- Storage buckets/configuration are a separate Supabase Storage API step. Preserve both private buckets and MIME/size restrictions; verification bucket stays private.
- Do not install pg_cron or create the five-minute review publication job in staging.
- No Edge Functions, Auth settings, SMTP, secrets, Stripe configuration, production data, or Auth identities are copied.
- Do not fabricate missing historical migrations.

## Mandatory pre-apply checks
1. Verify target project ID and empty state.
2. Review all generated SQL, role names, explicit grants and dependencies.
3. Confirm PostgreSQL supports `security_invoker` and `MAINTAIN` grants.
4. Confirm migrations execute as `postgres`; default ACL changes apply to that role only.
5. Verify staging has plpgsql, supabase_vault, pg_stat_statements, pgcrypto, uuid-ossp; keep pg_cron absent.
6. Validate effective privileges with `has_table_privilege`, `has_column_privilege`, and `has_function_privilege` after applying.
7. Apply only to isolated staging after review and rollback/rebuild plan.
8. Run the full synthetic positive/negative RLS matrix, especially cross-owner dashboard isolation.

## Limits
This database baseline is not a complete product deployment. Storage API configuration, Edge Functions, Auth flows, frontend QA, and Stripe test-mode behavior remain separate workstreams.
