# Staging Baseline Recovery — 11 Nov 2026

## Work performed in this pass
- Re-searched repository code for the known production view/routine/table identifiers and all known migration names.
- Re-read the three schema-recovery documents already committed to the repository.
- Re-listed repository commits (up to 100 recent results) and confirmed the visible history does not reveal the missing migration SQL files.
- Re-queried production billing constraints, columns, and indexes in bounded catalog queries.
- Queried staging migration history and public tables.

## Confirmed staging state
Project: `lzcyulncvjjxsyyivlty`
- Public base tables: 0.
- Migration history: 0.
- No DDL was applied.
- No production records, auth users, storage objects, service-role credentials, or Stripe secrets were copied.

## Migration source recovery
Production has 18 migration history entries, but the repository contains only one tracked migration SQL file corresponding to the owner analytics privilege restriction. The other 17 migration source files were not found in repository code search, tracked schema docs, or the recent repository commit list.

Known missing migrations remain:
- 20261108232216 weekly_reputation_and_service_insights
- 20261108232221 public_hourly_service_patterns
- 20261108232534 verified_business_owner_dashboard
- 20261108233117 secure_admin_review_for_owner_claims
- 20261109165629 secure_business_proposal_rpc_rls_fix
- 20261109170841 fix_business_photo_storage_upload_rls
- 20261109175108 private_user_space_foundation
- 20261109182421 private_business_messaging
- 20261110021755 connect_verified_business_owners_to_reviews_and_complaint_replies
- 20261110021830 owner_reviews_complaint_response_fix
- 20261110024121 flexible_owner_verification_levels
- 20261110024254 separate_activity_and_owner_verification_statuses
- 20261110045605 add_review_ai_moderation_audit
- 20261110060227 reputix_ads_admin_access_v1
- 20261110172535 add_user_subscriptions_for_stripe_checkout
- 20261112003552 revoke_public_monthly_history_access
- 20261112004244 prevent_duplicate_public_business_proposals

Do not reconstruct these as if they were original historical migrations. If the original SQL cannot be recovered, the alternative is a new, clearly labeled staging-only baseline generated from the live catalog and independently reviewed against exact columns, constraints, indexes, RLS policies, grants, views, routines, extensions, storage configuration, and dependencies.

## Billing schema verification
Production billing constraints, columns, and indexes were read from PostgreSQL catalogs:
- `user_subscriptions.provider_subscription_id` unique; FK user_id to auth.users ON DELETE CASCADE; FK plan_code to monetization_plans.
- `payment_events.provider_event_id` unique; status check includes received/processed/failed/ignored; business FK ON DELETE SET NULL.
- `business_subscriptions.provider_subscription_id` unique; business FK ON DELETE CASCADE; plan FK to monetization_plans; billing interval month/year.
- Active plan catalog rows: Free $0, Basic $13, Pro $25 USD.

## Important correction to historical documentation
Older notes in `SCHEMA-RECOVERY-PRIVILEGES-2026-11-11.md` refer to 26 foreign keys and 37 CHECK constraints. Later bounded catalog verification established the correct production totals as **24 foreign keys and 40 CHECK constraints**. The overall verified counts are 93 constraints (20 PK, 9 UNIQUE, 24 FK, 40 CHECK), 54 indexes, 35 policies, and 20 RLS-enabled public tables. Use the corrected totals.

## Decision
No schema baseline has been applied. The available schema notes are useful but are not yet a complete executable archive. A safe baseline still requires a fresh, bounded, exact extraction of all table DDL and dependent objects into a reviewed artifact. Do not use `supabase db push` against a guessed or incomplete directory.

Production and Stripe remain unchanged.
