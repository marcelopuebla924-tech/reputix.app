# Reputix — director checkpoint
**Checkpoint date:** 2026-11-11  
**Checkpoint time:** 8:54 p.m. PST (Los Angeles)  
**Repository:** `marcelopuebla924-tech/reputix.app`  
**Branch:** `main`  
**Latest commit before this checkpoint:** `ddf10077111e6fc34a7fa61328bd294d0b7d2fb4`

## Work completed in this session
Read-only production catalog inspection and documentation were completed and committed to GitHub. The following checkpoint artifacts were added:
- `STAGING-RECOVERY-BATCH-2026-11-11-2045-PST.md` — exact columns, constraints, and indexes for ten monetization/publication tables.
- `STAGING-RECOVERY-BATCH-2026-11-11-2050-PST.md` — exact columns, constraints, and indexes for the remaining ten public tables.
- `STAGING-RECOVERY-OBJECTS-2026-11-11-2055-PST.md` — five public views, five routines, security attributes, and ACL notes.
- `PRODUCTION-ACL-INVENTORY-2026-11-11-2058-PST.md` — explicit production relation ACL inventory.
- `STAGING-RECOVERY-MESSAGING-STORAGE-CRON-2026-11-11-2102-PST.md` — messaging column grants, Storage bucket metadata/policies, and production cron schedule.
- `STAGING-RECOVERY-RLS-EXACT-2026-11-11-2105-PST.md` — exact 35 public RLS policy inventory and expressions.
- `STAGING-RECOVERY-EXTENSIONS-2026-11-11-2107-PST.md` — installed extension comparison between production and staging.

## Current staging state — verified
Staging project: `lzcyulncvjjxsyyivlty`
- 0 public tables.
- 0 migration-history entries.
- 0 Edge Functions.
- No staging schema baseline has been applied.
- Five installed extensions match production by name/version/schema: plpgsql, supabase_vault, pg_stat_statements, pgcrypto, uuid-ossp.
- pg_cron is installed in production but absent from staging. Keep the production five-minute review-publication cron job out of staging unless isolated test fixtures and cleanup are deliberately prepared.

## Production safety
During this session, catalog queries were read-only. No production rows, schema, grants, RLS policies, Auth, Storage objects/configuration, Stripe settings, domain/DNS, or cron jobs were changed. Do not infer that historical production grant changes were newly authorized by this session; the existing messaging-permissions record explicitly flags provenance for owner confirmation. Do not roll back or reapply those live grants blindly.

## Reconciled catalog scope
- 20 public base tables.
- 93 constraints: 40 CHECK, 24 foreign keys, 20 primary keys, 9 UNIQUE.
- 54 public indexes.
- 35 RLS policies across 16 tables.
- Five public views and five public routines documented.
- Two private Storage buckets documented: `business-photos` and `business-verification-private`.
- Production has one active cron job: every five minutes calls `public.reputix_publish_valid_reviews()`; do not mirror automatically in staging.

## Important preservation requirements
- Preserve `business_photos.business_id` as text; it has no FK in the production catalog.
- Preserve partial/expression indexes exactly.
- Preserve messaging column-scoped permissions and participant RLS as a unit.
- Keep verification-document Storage private.
- Keep service-only tables backend-only.
- Keep Stripe secrets and all production records out of staging.
- Do not change the live domain, Auth configuration, Stripe live settings/prices/payouts/webhook destination, or production data.
- Do not invent missing historical migration files. Repository migration history is incomplete relative to the live production catalog.

## Git checkpoint
Latest verified main commit before this checkpoint:
`ddf10077111e6fc34a7fa61328bd294d0b7d2fb4`

Compared with the earlier director checkpoint `1ea21bb4a86994b7c74430189f4f8d1cb011f65a`, GitHub reports main ahead by 81 commits and not behind. This is the branch comparison, not a claim that all 81 commits were authored in this single work session.

## Next work — do not skip gates
1. Reconcile exact effective table/column grants, RLS expressions, view dependencies, routine ACLs, extension dependencies, Storage configuration, and cron metadata into one baseline manifest.
2. Validate that the extracted table/constraint/index totals reconcile with the catalog.
3. Generate a staging-only baseline SQL migration from verified definitions; review dependency order and rollback/rebuild strategy.
4. Apply only to the isolated staging project after the baseline is complete and reviewed. Do not touch production.
5. Create synthetic staging users/businesses and run positive/negative RLS tests, cross-business isolation, review submission/moderation, photo upload, messaging/read receipts, owner dashboards, and subscription/checkout test-mode paths.
6. Only after staging QA passes, resume launch-readiness certification and browser tests.

## Director operating rules
Continue autonomously in safe, reversible steps. Preserve working features. Never delete production data/accounts/reviews/businesses/photos. No production schema or security changes without explicit scoped approval and a rollback plan. Record material progress with timestamps and commits. Report clearly what is verified versus pending.

**Checkpoint status:** catalog documentation advanced; staging reconstruction and functional integration testing are still pending.
