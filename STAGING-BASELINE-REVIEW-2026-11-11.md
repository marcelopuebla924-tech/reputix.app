# Reputix staging baseline candidate — review required

**Generated:** 2026-11-11  
**Source:** read-only PostgreSQL catalogs from production project `udvsrmfgjfinwbgvhchs`.  
**Intended target:** isolated staging project `lzcyulncvjjxsyyivlty` only.  
**Status:** candidate only — NOT applied to either project.

## Reconciliation summary
- 20 public base tables.
- 93 constraints.
- 54 total indexes (29 primary/unique indexes are created by constraints; 25 additional indexes are emitted explicitly).
- 35 permissive RLS policies across 16 tables.
- 5 public routines.
- 5 public views.
- 0 public triggers and 0 public custom enum/domain types.
- Two bigint IDs (`ad_clicks.id`, `ad_impressions.id`) are `GENERATED ALWAYS AS IDENTITY`. Their internal identity sequences are created by PostgreSQL even though the earlier information_schema sequence inventory did not list standalone public sequences.
- `business_photos.business_id` remains TEXT and has no FK.
- Both partial/expression indexes are preserved.
- No production records, Auth identities, Storage objects, Stripe secrets, or cron jobs are copied.

## Intentional staging-only security candidate
- All five views are created with `security_invoker=true`. This includes the two production owner views flagged by Security Advisor. Their query definitions are preserved, but their effective row visibility must be verified with two synthetic owners and least-privilege base-table grants.
- Staging's broad default ACLs for the `postgres` migration owner are revoked for future public tables, sequences, and functions. Supabase-managed `supabase_admin` default ACLs are not altered.
- The baseline recreates exact explicit table/view ACLs, column grants, routine grants, and RLS policies as extracted. It does not blindly inherit default grants.
- Messaging grants remain column-scoped for conversation INSERT and message INSERT/read-receipt UPDATE.
- The production anonymous proposal RPC remains callable according to its existing ACL pending abuse-control tests; do not revoke it until the public proposal flow has an approved replacement.

## Excluded by design
- Storage buckets must be created/configured using Supabase Storage APIs; private verification bucket stays private. The two Storage object policies are documented separately and must be recreated only after the bucket/API setup is reviewed.
- Production pg_cron and the five-minute review-publishing job are excluded from staging. No scheduled job is created.
- No Edge Functions, Auth settings, SMTP, secrets, or Stripe configuration are copied.
- No historical migration files are fabricated.

## Mandatory pre-apply review
1. Verify staging project ID is exactly `lzcyulncvjjxsyyivlty` and it remains empty.
2. Review all 20 table definitions, 93 constraints, 54 indexes, 35 policies, 5 routines, 5 views, and effective grants.
3. Confirm PostgreSQL version supports `security_invoker` views and `MAINTAIN` grants.
4. Confirm all five required extensions are already installed in staging; keep pg_cron absent.
5. Confirm the `postgres` role owns/runs the migration and default privilege revokes apply to that owner.
6. Run baseline in a disposable clone or transactionally isolated staging, capture rollback/rebuild procedure, then apply only after approval.
7. After apply, run the two-owner matrix and positive/negative RLS/API tests. Do not promote to production based only on DDL success.

## Important limitations
- Storage configuration is a separate API operation and not part of this SQL file.
- This candidate mirrors production relation and column ACLs except for the explicitly documented invoker-view and default-privilege hardening.
- A DDL baseline is not a full application deployment; frontend, Edge Functions, Auth flows, Storage and Stripe test-mode behavior require separate validation.

