# Production Security & View Reconciliation — 2026-11-11

## Scope and safety
Read-only inspection of production project `udvsrmfgjfinwbgvhchs` and staging project `lzcyulncvjjxsyyivlty`. No SQL writes, DDL, grants, data changes, Auth changes, Storage changes, cron changes, or Stripe changes were performed in this audit.

## Staging status re-confirmed
- `public` base tables: 0
- `public` views: 0
- No baseline has been applied.
- A direct query against `supabase_migrations.schema_migrations` failed because that relation is absent in staging; this is consistent with the empty/uninitialized staging state, not evidence of a migration failure. Do not create that history schema manually.

## Production view security findings
The five production views and their current `reloptions` were inspected:
- `business_hourly_patterns`: `security_invoker=true`
- `recent_review_highlights`: `security_invoker=true`
- `weekly_business_rankings`: `security_invoker=true`
- `owner_business_dashboard`: no `security_invoker=true`
- `owner_business_hourly_patterns`: no `security_invoker=true`

Supabase Security Advisor currently flags the two owner views as SECURITY DEFINER views (ERROR). They expose owner-specific business metrics and should not be copied into staging as-is without a security design review and cross-business isolation tests.

Important nuance: the owner views are currently granted SELECT to `authenticated` and `service_role`, while their definitions filter by `auth.uid()`, verified owner claims, approved businesses, and active subscription plans. Simply adding `security_invoker=true` may change access behavior because invoker rights and underlying table grants/RLS apply. Before changing either view, test with at least two synthetic owners, each with separate businesses, and verify that neither can see the other's rows. Also verify that required underlying SELECT grants/policies are sufficient without widening access. Do not modify production as part of this work.

## Production routine security findings
The live definitions and ACLs were inspected:
- `owner_respond_to_complaint(uuid,text)`: SECURITY DEFINER; EXECUTE for authenticated and service_role, not anon. Function checks `auth.uid()`, response length, and verified ownership.
- `reputix_publish_valid_reviews()`: SECURITY DEFINER; EXECUTE only for postgres and service_role. Called by the existing scheduled publishing job; do not make client-callable.
- `submit_business_proposal(...)`: SECURITY DEFINER; EXECUTE for PUBLIC, anon, authenticated, and service_role. It validates required fields and lengths, rejects matching pending/approved proposals, and inserts new proposals with status `pending`. This appears to be an intentional anonymous business-proposal entry point, but the public endpoint needs abuse/rate-limit review before launch. Do not revoke anon access blindly because it may break the public add-business flow.
- `is_reputix_admin()`: SECURITY INVOKER; checks `app_metadata.reputix_role`, not user-editable user metadata; empty search_path.
- `refresh_business_monthly_history(date)`: SECURITY INVOKER; EXECUTE only for postgres/service_role; empty search_path.

Three SECURITY DEFINER routines use `search_path=public` (`owner_respond_to_complaint`, `reputix_publish_valid_reviews`, and `submit_business_proposal`). Their definitions qualify their table references with `public.`; still preserve exact function bodies and ACLs in staging and include a hardening review. Do not change live function security attributes or grants without tests and an approved rollback plan.

## Current Supabase Security Advisor findings (production)
- INFO, 4 tables have RLS enabled with no policies: `business_monthly_history`, `business_verification_documents`, `payment_events`, `review_ai_moderation`. These appear intentionally backend/service-only from the current grant inventory; preserve this model and verify that only backend roles need access.
- ERROR, 2 SECURITY DEFINER views: `owner_business_dashboard`, `owner_business_hourly_patterns`.
- WARN, 1 SECURITY DEFINER function executable by anon: `submit_business_proposal(...)`.
- WARN, 2 SECURITY DEFINER functions executable by authenticated: `owner_respond_to_complaint(...)` and `submit_business_proposal(...)`. These are purpose-specific RPCs with internal authorization/validation; verify their intended exposure rather than removing grants mechanically.
- WARN, Auth leaked-password protection disabled. This is a hosted Auth configuration decision and must be reviewed separately; no Auth setting was changed.

## Supabase change-log items relevant to future work
- Supabase CLI v3 (released Nov 2, 2026) changes database commands to local-by-default and requires explicit `--remote` for hosted operations; avoid running CLI deploy/push commands until the version and target behavior are verified.
- Supabase Data API exposure defaults changed: new public tables are no longer automatically exposed; the change was enforced on existing projects from Oct 30, 2026. The staging baseline must explicitly model intended API exposure/grants rather than assuming public tables automatically appear in the Data API.
- Supabase's Storage schema is read-only for direct SQL modification; use Storage APIs for objects/buckets and policies/configuration through supported mechanisms. Do not copy or mutate Storage system tables directly.

## Baseline gate — still not approved for application
Before applying a staging baseline:
1. Reconcile exact column grants and relation grants from the production catalog, preserving the narrower column-level messaging grants.
2. Reconcile view ownership, ACLs, and security-invoker behavior; resolve the two owner-view Advisor findings in a staging-only candidate and test two-owner isolation.
3. Preserve routine definitions, ACLs, SECURITY DEFINER flags, and search_path exactly until each proposed change is separately reviewed.
4. Confirm backend-only tables remain unavailable to anon/authenticated and have RLS enabled with no public policies.
5. Preserve exact RLS policy expressions, Storage bucket configuration/policies, extensions, and cron metadata; keep `pg_cron` and the publish job out of staging until a fixture/cleanup strategy exists.
6. Generate a clearly labeled staging-only baseline, review it, then apply only to the isolated empty staging project.
7. Run synthetic positive/negative RLS tests, owner cross-business isolation, anonymous business proposal abuse checks, review submission/moderation, photo uploads, messaging/read receipts, dashboard access, and test-mode subscription paths.

## Decision
**No production change. No staging DDL yet.** The newly confirmed owner-view Advisor errors and the public proposal RPC exposure are explicit review gates. Continue with a staging-only design and test plan before any baseline application.
