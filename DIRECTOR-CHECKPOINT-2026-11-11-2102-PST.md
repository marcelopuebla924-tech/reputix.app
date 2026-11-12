# Reputix Director Checkpoint — 2026-11-11 9:02 p.m. PST

## Current project
- Repository: `marcelopuebla924-tech/reputix.app`, branch `main`.
- Production Supabase: `udvsrmfgjfinwbgvhchs`.
- Isolated staging Supabase: `lzcyulncvjjxsyyivlty`.
- Domain: `www.reputixapp.com` (do not alter DNS/domain).
- Stripe live configuration, prices, payouts, and webhook destination remain protected; no changes made.

## Work completed in this continuation
Three new repository documents committed after the 8:54 p.m. checkpoint:
1. `PRODUCTION-SECURITY-VIEW-RECONCILIATION-2026-11-11.md`
2. `STAGING-SECURITY-TEST-MATRIX-2026-11-11.md`
3. `STAGING-RECOVERY-DEPENDENCIES-DEFAULT-PRIVILEGES-2026-11-11.md`

Latest commit: `1a2ffe628c30cc03c54bc9c9a2478eed4c50c2fd`.

## New verified findings
- Production catalog: 0 public triggers, 0 public sequences, 0 public enum/domain types; 35 RLS policies on 16 tables.
- Staging catalog: 0 public triggers, 0 public sequences, 0 public enum/domain types, 0 RLS policies; 0 public base tables and 0 public views.
- Production default privileges in public schema are broad for future objects under both postgres and supabase_admin owners: anon/authenticated/service_role defaults include broad table privileges, EXECUTE on functions, and sequence privileges. Do not copy these defaults to staging. Do not modify production defaults. Staging baseline must use explicit least-privilege per-object grants and verify effective privileges.
- ad_clicks.id and ad_impressions.id are bigint NOT NULL with no default; no public sequences exist. Do not add identity/serial behavior.
- Supabase docs confirm public views default to owner permissions; security_invoker=true causes querying-role permissions/RLS to apply. Owner dashboard/hourly views remain a security gate. Do not widen underlying grants merely to make invoker views work.
- Supabase changelog checked: CLI v3 local-by-default breaking change dated Nov 4, 2026; Data API automatic exposure change effective Oct 30, 2026. Newly created staging tables need explicit exposure/grants.

## Security gates still open
1. Owner views `owner_business_dashboard` and `owner_business_hourly_patterns` are flagged SECURITY DEFINER views.
2. `submit_business_proposal(...)` is SECURITY DEFINER and executable by PUBLIC/anon/authenticated; appears to support anonymous add-business flow, so do not revoke blindly. Abuse controls need review.
3. Auth leaked-password protection is disabled in production; do not change hosted Auth settings without separate review/approval.
4. Preserve exact column-level messaging grants and all 35 RLS policies.
5. Keep pg_cron and the review publishing schedule out of staging until disposable fixtures and cleanup are ready.

## Current staging state and safety
- Staging remains empty and isolated; no baseline DDL has been applied.
- No production DDL/DML, grants, Auth, Storage, cron, domain, or Stripe changes were made in this continuation.
- No production records, accounts, reviews, photos, credentials, or Stripe events were copied.
- A query for `supabase_migrations.schema_migrations` returned relation-not-found in empty staging; do not create that schema manually.

## Next safe work
- Build a reviewed staging-only baseline candidate from verified catalog documents.
- Explicitly revoke broad default grants on baseline objects, then add only intended relation/column/function grants.
- Reconcile exact table ACLs and column ACLs, RLS, routines, view ACLs, Storage policy/configuration, extensions, and dependencies.
- Resolve owner views in staging with invoker-security candidate and two-owner isolation tests; if invoker model fails, redesign least-privilege API access rather than widening grants.
- Keep anonymous proposal RPC only with validation plus an abuse-control decision.
- Apply only to empty isolated staging after full review; then run the synthetic security test matrix.

## User authorization and guardrails
User has authorized autonomous project progress, safe corrections, testing, GitHub commits, and progress logging. Continue without repeatedly asking for routine permission. Do not delete production data/accounts/reviews/businesses/photos or change domain, Stripe live settings, Auth-sensitive settings, or production schema/security without explicit scoped approval and rollback plan.
