# Reputix Director Checkpoint — 2026-11-11 9:11 p.m. PST

## Project identifiers
- GitHub: `marcelopuebla924-tech/reputix.app`, branch `main`.
- Production Supabase: `udvsrmfgjfinwbgvhchs`.
- Isolated staging Supabase: `lzcyulncvjjxsyyivlty`.
- Domain: `www.reputixapp.com` — do not change DNS/domain.
- Stripe live mode, prices, payouts, webhook destination remain protected and unchanged.

## Work applied to staging
Three successful Supabase migrations are recorded:
1. `20261112050900` — `reputix_staging_baseline_20261111`
2. `20261112050922` — `staging_fk_performance_indexes_20261111`
3. `20261112050928` — `staging_storage_object_policies_20261111`

The first baseline attempt failed because a foreign key was added before its referenced primary key. The failed transaction was verified to have left staging empty (0 tables, 0 views, 0 policies and unchanged default ACLs). Constraint order was corrected: all PK/UNIQUE constraints first, then CHECK and FK constraints. The next migration succeeded. The SQL source file is marked as already applied; do not rerun it.

## Verified staging schema
- 20 public base tables.
- 93 constraints.
- 54 production-parity indexes plus 5 staging-only FK indexes = 59.
- 35 public RLS policies across 16 tables.
- RLS enabled on all 20 base tables.
- 5 routines.
- 5 views, all with `security_invoker=true`.
- Two identity columns: `ad_clicks.id` and `ad_impressions.id` are `bigint GENERATED ALWAYS AS IDENTITY`.
- 2 Storage object policies.
- 0 Storage buckets currently created.
- 0 Edge Functions deployed.
- No pg_cron extension or scheduled review publishing job in staging.

## Security checks passed
- The two owner views no longer trigger the SECURITY DEFINER view Advisor error.
- Owner views: authenticated SELECT allowed; anon SELECT denied.
- Backend-only tables `business_monthly_history`, `business_verification_documents`, `payment_events`, `review_ai_moderation`: anon/authenticated SELECT denied; service_role SELECT allowed.
- Messaging permissions verified: conversation INSERT is column-scoped; message INSERT is limited to conversation_id/sender_id/body; UPDATE is read_at only; message body UPDATE and table-level UPDATE are denied.
- Staging default ACLs for future public objects created by postgres are tightened; Supabase-managed supabase_admin defaults remain untouched.

## Synthetic smoke tests completed and cleaned
- Anonymous business proposal RPC succeeded and returned a UUID.
- Proposal was stored as pending and hidden from anon; synthetic row deleted.
- Blank business name rejected.
- Oversized business name rejected.
- Duplicate pending business proposal rejected; its synthetic row was deleted.
- `is_reputix_admin()` accepted trusted `app_metadata.reputix_role=admin` and rejected a role present only in `user_metadata`.
- Anonymous pending review submission succeeded for a synthetic approved business; pending review was not publicly visible.
- Anonymous attempt to insert a published review was rejected by RLS.
- Synthetic business and review records were deleted. Final check: 0 synthetic QA businesses and 0 synthetic QA reviews remain.

## Current Advisor results
### Security
- INFO: 4 RLS-enabled service-only tables have no policies; expected with current service_role-only access.
- WARN: `submit_business_proposal(...)` remains SECURITY DEFINER and executable by anon/authenticated. It supports public add-business, passed validation/pending-state smoke tests, but abuse/rate-limit controls remain a launch gate.
- WARN: `owner_respond_to_complaint(...)` remains SECURITY DEFINER and executable by authenticated. Test with real synthetic Auth owners before release.
- No owner-view SECURITY DEFINER view error remains.

### Performance
- Five unindexed foreign keys were covered with staging-only indexes; Advisor no longer reports unindexed foreign keys.
- 28 unused-index INFO findings are expected on an empty staging workload; do not remove indexes based on this.
- Five multiple-permissive-policy WARN findings remain. Preserve current policy OR semantics unless an equivalent redesign is tested.

## Saved repository artifacts
- `STAGING-BASELINE-CANDIDATE-2026-11-11.sql` — applied staging SQL source; do not rerun.
- `STAGING-BASELINE-REVIEW-2026-11-11.md` — application/review record.
- `STAGING-FK-PERFORMANCE-PATCH-2026-11-11.sql` and companion MD.
- `STAGING-STORAGE-POLICIES-2026-11-11.sql` — applied staging Storage object policy source.
- `STAGING-STORAGE-SETUP-2026-11-11.md` — exact bucket settings and remaining tests.
- `STAGING-DEPLOYMENT-VERIFICATION-2026-11-11.md` — verification and test evidence.
- Previous catalog, RLS, ACL, dependency, and security documents remain in main.

## Remaining work
1. Create the two private staging buckets using Supabase Storage API/Dashboard:
   - `business-photos`: private, 5 MiB, JPEG/PNG/WebP.
   - `business-verification-private`: private, 5 MiB, JPEG/PNG/PDF.
   The connected Supabase tools available in this workflow do not expose bucket create/update operations. Do not write to Storage system tables.
2. Run Storage upload/read-denial tests and delete synthetic objects.
3. Create two synthetic Auth users through supported Supabase Auth Admin/API/UI; then test owner dashboard/hourly-view cross-business isolation and messaging.
4. Test `owner_respond_to_complaint` with verified Owner A, Owner B, and an unverified user.
5. Exercise subscriptions/checkout in Stripe test mode only.
6. Deploy/test staging Edge Functions and frontend end-to-end flows; staging currently has none.

## Safety boundary
No production schema, grants, data, Auth, Storage, cron, domain, DNS, or Stripe settings were changed. No production users, businesses, reviews, photos, verification documents, secrets, or payment events were copied. Preserve production untouched until explicit scoped approval and rollback plan.
