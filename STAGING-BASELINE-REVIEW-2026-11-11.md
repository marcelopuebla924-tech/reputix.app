# Reputix staging baseline candidate — review required

**Generated:** 2026-11-11 (Los Angeles)  
**Source:** read-only PostgreSQL catalogs from production `udvsrmfgjfinwbgvhchs`.  
**Target:** isolated staging `lzcyulncvjjxsyyivlty` only.  
**Status:** candidate only; NOT applied.

## Reconciliation
- 20 public base tables.
- 93 validated constraints.
- 54 total indexes: 29 primary/unique indexes created by constraints and 25 additional indexes.
- 35 permissive RLS policies across 16 tables.
- 5 public routines and 5 public views.
- 0 public triggers and 0 public custom enum/domain types.
- `ad_clicks.id` and `ad_impressions.id` are `bigint GENERATED ALWAYS AS IDENTITY`; their internal identity sequences are managed by PostgreSQL.
- `business_photos.business_id` remains TEXT with no FK.
- Both partial/expression indexes are preserved.
- No production records, Auth identities, Storage objects, Stripe secrets, or cron jobs are copied.

## Intentional staging-only changes
- All five views are created with `security_invoker=true`; this changes the two flagged owner views from production's default owner context. Preserve the definitions and test with two synthetic owners. Do not widen underlying grants to force tests to pass.
- Only the `postgres` default privileges in staging are tightened. Supabase-managed `supabase_admin` defaults are untouched.
- Existing explicit relation grants, column grants, routine EXECUTE grants, and all 35 RLS policies are recreated from production catalog evidence.
- Messaging grants remain scoped: conversations INSERT limited to selected columns; messages INSERT limited to conversation_id/sender_id/body and UPDATE limited to read_at.
- Anonymous business proposal RPC remains available per its current ACL; test abuse controls before launch.

## Excluded
- Storage buckets/configuration must be created through Supabase Storage APIs. Preserve both private buckets and their exact MIME/size restrictions; verification bucket remains private. Storage object policies are documented in the separate inventory and require a separate staging API/SQL step.
- Do not install pg_cron or create the production five-minute review publishing job in staging.
- No Edge Functions, Auth configuration, SMTP, secrets, or Stripe configuration are copied.
- No missing historical migrations are fabricated.

## Mandatory pre-apply checks
1. Verify exact staging project ID and empty state.
2. Review generated SQL for all objects and confirm role names exist.
3. Confirm staging PostgreSQL version supports `security_invoker` and `MAINTAIN`.
4. Confirm migrations execute as `postgres`; default privilege changes apply only to that owner.
5. Confirm extensions already present: plpgsql, supabase_vault, pg_stat_statements, pgcrypto, uuid-ossp. Keep pg_cron absent.
6. Validate ACLs using `has_table_privilege`, `has_column_privilege`, and `has_function_privilege` after applying.
7. Apply only to isolated staging after review and rollback/rebuild plan.
8. Run the full synthetic positive/negative RLS matrix, especially cross-owner dashboard isolation, before any launch-readiness claim.

## Known limitation
This is a database schema/security baseline candidate, not a full product deployment. Storage setup, Edge Functions, Auth behavior, frontend flows, and Stripe test-mode integration remain separate workstreams.
