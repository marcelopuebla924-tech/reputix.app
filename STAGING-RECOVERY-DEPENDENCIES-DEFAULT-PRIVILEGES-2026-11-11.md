# Reputix — final dependency and default-privilege inventory
**Date:** 2026-11-11 (Los Angeles time)

## Scope
Read-only catalog inspection of production project `udvsrmfgjfinwbgvhchs` and staging project `lzcyulncvjjxsyyivlty`. No DDL, DML, grants, Auth, Storage, cron, domain, or Stripe changes were made.

## Trigger, sequence, and custom type inventory
Production public schema:
- User-defined table triggers reported by `information_schema.triggers`: 0
- Standalone sequences reported by `information_schema.sequences`: 0; however, `ad_clicks.id` and `ad_impressions.id` are `bigint GENERATED ALWAYS AS IDENTITY`, with PostgreSQL-managed internal identity sequences.
- Public enum/domain types: 0
- RLS policies: 35 across 16 tables

Staging public schema:
- Triggers: 0
- Sequences: 0
- Custom enum/domain types: 0
- RLS policies: 0

Important correction/clarification: `ad_clicks.id` and `ad_impressions.id` are bigint NOT NULL columns with no default, and the public schema has no sequences. Do not assume identity/serial behavior or add a sequence/default during reconstruction.

## Production default privileges — important baseline hazard
The production catalog contains default ACL entries for future objects in `public` owned by both `postgres` and `supabase_admin`. For both owners, the recorded default ACLs include:
- Future tables (`object_type=r`): anon, authenticated, and service_role receive broad table privileges (ACL letters `arwdDxtm`).
- Future functions (`object_type=f`): anon, authenticated, and service_role receive EXECUTE (`X`).
- Future sequences (`object_type=S`): anon, authenticated, and service_role receive sequence privileges (`rwU`).

These are global defaults for future objects created under those owners; they are not proof that every existing table currently has those exact grants. Existing relation and column ACL inventories remain the source of truth for current objects.

### Baseline handling
- Do not copy these broad default privileges blindly into staging.
- Do not change production default privileges as part of staging reconstruction.
- For staging baseline objects, explicitly set least-privilege relation and column grants per the reviewed inventory, then verify effective privileges with `has_table_privilege`, `has_column_privilege`, and `has_function_privilege` under anon/authenticated/service_role.
- Be especially careful with new SECURITY DEFINER routines: default PUBLIC EXECUTE behavior must be explicitly reviewed and revoked where the function is not intended to be callable by PUBLIC/anon.
- Avoid setting blanket default grants that accidentally expose future backend-only tables, functions, or sequences.

## Dependency and ordering notes
- No public triggers or standalone sequences need to be recreated based on this inventory. Preserve the two identity columns exactly as `GENERATED ALWAYS AS IDENTITY`.
- The 20 table constraints include foreign keys to `auth.users`; staging Auth must remain a managed Supabase Auth schema. Do not create or alter `auth.users` manually.
- Public view dependencies and definitions are documented in `STAGING-RECOVERY-OBJECTS-2026-11-11-2055-PST.md`. Create the five views only after all referenced tables and routines exist.
- Routines and RLS policies reference `auth.uid()`, `auth.jwt()`, and `public.is_reputix_admin()`; ensure functions and base tables exist before creating policies that call helper routines.
- Storage buckets/policies must be configured through supported Storage interfaces, not by writing to Storage system tables. The two bucket names, privacy settings, file limits, MIME allowlists, and policy logic are in the Storage/cron inventory document.
- Keep production's pg_cron extension and active scheduled review publication job out of staging until disposable fixtures and cleanup are in place.

## Documentation and current Supabase guidance
The current Supabase RLS documentation confirms that exposed-schema tables require RLS and that invoker-security views apply the querying role's permissions/RLS to underlying tables. The Database Advisor 0010 guidance recommends `security_invoker=on` for public views that must respect RLS. See:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0010_security_definer_view

The current Supabase changelog lists the CLI v3 local-by-default change (Nov 4, 2026) and the Data API exposure breaking change, effective for all projects Oct 30, 2026. Do not rely on automatic Data API exposure for newly created staging tables; explicitly configure intended grants/exposure:
- https://supabase.com/changelog/supabase-cli-v3
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

## Baseline gate
Catalog extraction is more complete, but this is still not an executable migration. Before applying:
1. Build a staging-only candidate with explicit grants (not inherited broad defaults), exact RLS, exact constraints/indexes, and all five views/routines.
2. For the two owner views, use an invoker-security candidate only if owner-scoped access works without widening base-table grants; otherwise redesign the API boundary rather than loosening grants.
3. Preserve the intentionally public proposal RPC only with input validation plus an abuse-control decision.
4. Validate exact counts: 20 tables, 93 constraints, 54 indexes, 35 policies, 5 views, 5 routines; zero public triggers, sequences, and custom enum/domain types in the observed catalog.
5. Run synthetic cross-owner and role-based tests before any launch-readiness claim.

**Decision:** No production change and no staging DDL. This inventory adds a significant warning: production default privileges are broad for future public-schema objects, so staging must use explicit per-object least-privilege grants.
