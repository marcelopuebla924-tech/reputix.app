# Reputix Director checkpoint — 2026-11-11 (America/Los_Angeles)

## Session objective
Continue safe recovery of missing Supabase migration source and prepare an isolated staging environment for real end-to-end testing.

## Verified repository recovery
- Repository: marcelopuebla924-tech/reputix.app, branch `main`.
- Recursive Git tree inspected: current tree contains one tracked SQL migration under `supabase/migrations/`: `20261112002500_restrict_owner_dashboard_view_privileges.sql`.
- GitHub commit search for migration-related history returned the original migration commit `61c10b73b534d7368eb8d48320359ed44ef9f15c` plus documentation/checkpoint commits, but did not reveal the missing 17 SQL migration source files.
- Code search did not locate a second tracked migration source.
- Therefore the migration source recovery gap remains real; do not invent migration contents or run `supabase db push`.

## Environment status
- Production Supabase project `udvsrmfgjfinwbgvhchs`: read-only inspection only in this session.
- Staging Supabase project `lzcyulncvjjxsyyivlty`: healthy, zero public tables, zero migrations, zero security advisor findings. No production data was copied.
- No database writes or schema changes were made in this session.
- Production security advisor still reports:
  - 2 SECURITY DEFINER owner analytics views.
  - 4 RLS-enabled tables without policies: `business_monthly_history`, `business_verification_documents`, `payment_events`, `review_ai_moderation`.
  - SECURITY DEFINER RPCs `submit_business_proposal` (anon/authenticated) and `owner_respond_to_complaint` (authenticated).
  - Leaked-password protection disabled.
  These are known findings requiring deliberate review; no Auth/security setting was changed.

## Recovered schema facts
- Production verbose table inventory confirms the previously recorded public schema structure, RLS state, columns, defaults, primary keys, and foreign keys.
- Important consistency note: `business_photos.business_id` is text and no FK to businesses appears in its constraints. Preserve this current behavior in any staging reconstruction until the product/backend relationship is verified; do not silently change its type or add a FK.
- Existing owner-analytics least-privilege migration is retained in GitHub; it removes anon access to the two owner views and leaves authenticated SELECT only.
- Existing staging plan and QA suite remain in the repository. Browser/UI tests are not evidence of live Supabase Auth, storage, RPC, Stripe, email, or webhook E2E behavior.

## Safety / next actions
1. Recover further SQL only from actual Git objects, database catalog definitions, or a genuine schema export. No fabricated migration history.
2. Build a reviewed, staging-only baseline only after the complete DDL/dependencies, RLS, policies, grants, views, routines, indexes, extensions, storage buckets/policies are captured.
3. Keep staging scheduler disabled or isolate it to disposable fixtures.
4. Use staging-only credentials and Stripe test mode; never expose production service-role or Stripe secrets.
5. Run real disposable-account E2E tests before declaring readiness.
6. Do not alter production data, domain, Auth settings, Stripe live mode/prices/payouts/webhook destination, or deployed production schema without the established safeguards.

## Current release distinction
The current production-facing frontend/browser QA status and the staging backend readiness are separate. A passing browser suite does not certify backend readiness. Staging remains unbuilt pending safe schema-source recovery.
