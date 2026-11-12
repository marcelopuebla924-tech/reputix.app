# Reputix staging deployment verification — 2026-11-11

## Applied staging migrations
Project: `lzcyulncvjjxsyyivlty` (isolated staging only)

1. `20261112050900` — `reputix_staging_baseline_20261111`
2. `20261112050922` — `staging_fk_performance_indexes_20261111`
3. `20261112050928` — `staging_storage_object_policies_20261111`

The first baseline attempt failed because a foreign key was added before its referenced primary key. The migration was rolled back: staging was rechecked at 0 tables, 0 views, 0 policies, and unchanged default ACLs. The SQL was corrected to create all primary/unique constraints before foreign keys, then the baseline applied successfully.

## Verified schema totals after application
- 20 public base tables
- 93 constraints
- 59 indexes (54 production-parity + 5 staging-only foreign-key indexes)
- 35 public RLS policies across 16 tables
- 5 public routines
- 5 public views
- RLS enabled on all 20 base tables
- 2 Storage object policies
- 2 IDENTITY columns: `ad_clicks.id`, `ad_impressions.id`
- 0 Edge Functions in staging
- 0 Storage buckets currently created in staging
- No cron job or pg_cron scheduler copied

## Security verification
- All five views have `security_invoker=true`; owner views have authenticated SELECT and no anon SELECT.
- Four backend-only tables (`business_monthly_history`, `business_verification_documents`, `payment_events`, `review_ai_moderation`) deny SELECT to anon/authenticated and allow service_role.
- Messaging grants verified:
  - authenticated can INSERT allowed conversation columns, but has no table-level INSERT.
  - authenticated can INSERT message body, but has no table-level UPDATE.
  - authenticated can UPDATE `read_at`, but cannot UPDATE `body`.
- Staging default ACLs for future public tables/functions/sequences owned by postgres are restricted to postgres. Supabase-managed supabase_admin defaults were not changed.
- The two production owner-view SECURITY DEFINER Advisor errors are gone in staging.

## Functional/RLS smoke tests performed with synthetic records
1. Anonymous business proposal RPC succeeded and returned a UUID.
2. The new proposal was stored as `pending`; anon could not SELECT it. The synthetic row was deleted.
3. Blank business name was rejected with `Business name is required`.
4. Oversized business name was rejected by field-length validation.
5. `is_reputix_admin()` returned true for trusted JWT `app_metadata.reputix_role=admin` and false when the role was present only in user_metadata.
6. Anon could submit a pending review for a synthetic approved business; pending review was not publicly visible.
7. Anon could not insert a review with status `published`; RLS rejected it.
8. Synthetic business and review rows were deleted after the test.

## Current Advisor findings and interpretation
### Security
- INFO: 4 RLS-enabled service-only tables have no policies. This is intentional with current backend-only grants.
- WARN: `submit_business_proposal(...)` remains SECURITY DEFINER and executable by anon/authenticated; it supports public add-business and passed the input/pending-state smoke tests. Abuse/rate limiting still needs review before public launch.
- WARN: `owner_respond_to_complaint(...)` remains SECURITY DEFINER and executable by authenticated; its owner/response checks must be tested with real synthetic Auth users.
- No owner-view SECURITY DEFINER lint remains.

### Performance
- No unindexed foreign-key findings remain after the five staging-only indexes.
- INFO: 28 indexes unused because staging has no workload; retain pending representative load tests.
- WARN: 5 multiple permissive policy findings; do not consolidate without proving equivalent OR behavior.

## Remaining blockers before full sign-off
1. Create both private Storage buckets using the Supabase Storage API/Dashboard, with exact size and MIME restrictions in `STAGING-STORAGE-SETUP-2026-11-11.md`.
2. Run Storage upload/read denial tests and clean up all synthetic objects.
3. Create two synthetic Auth users through the supported Auth Admin/API/UI path, verify separate owner claims, and run the cross-business isolation matrix on both owner views and messaging.
4. Test `owner_respond_to_complaint` with verified owner A, owner B, and an unverified user.
5. Exercise subscription/checkout in Stripe test mode only; no live Stripe settings were changed.
6. Test Edge Functions and frontend end-to-end flows; staging currently has no Edge Functions deployed.

## Safety boundary
No production schema, grants, data, Auth, Storage, cron, domain, DNS, or Stripe settings were changed. No production users, businesses, reviews, photos, documents, secrets, or payment events were copied to staging.
