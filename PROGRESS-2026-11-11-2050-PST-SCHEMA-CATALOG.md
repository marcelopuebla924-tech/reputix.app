# Reputix staging schema recovery — checkpoint
Date: 2026-11-11 (PST)
Repository: marcelopuebla924-tech/reputix.app
Branch: main
Production Supabase: udvsrmfgjfinwbgvhchs
Staging Supabase: lzcyulncvjjxsyyivlty

## Safety
- Production was queried read-only only in this work session.
- No production rows, schema, auth settings, domain, Stripe settings, secrets, or storage objects were changed.
- Staging remains an empty isolated project; no production user/business/review/payment data was copied.
- Do not deploy production edge functions or copy production secrets to staging.
- Do not run supabase db push using guessed or incomplete migration history.

## Completed in this pass
1. Requeried pg_policies for the full public schema and captured 35 policies across 16 tables, including roles, commands, USING and WITH CHECK expressions.
2. Saved a policy inventory and staging reconstruction cautions in:
   SCHEMA-RECOVERY-RLS-POLICY-INVENTORY-2026-11-11.md
3. Read information_schema.columns in bounded batches for all 20 public base tables:
   - businesses, reviews, business_owner_claims, business_photos, user_profiles
   - business_conversations, business_messages, complaints, business_verification_documents, review_ai_moderation
   - business_monthly_history, business_promotions, business_subscriptions, monetization_plans, user_subscriptions
   - ad_campaigns, ad_clicks, ad_impressions, payment_events, user_publications
4. Column extraction included ordinal position, SQL data type, underlying UDT, nullability, defaults, and character limit where relevant.

## Verified architecture totals (previous catalog snapshots, to reconcile again before baseline)
- 20 public base tables; RLS enabled on all 20.
- 35 public RLS policies across 16 tables.
- 93 constraints: 40 CHECK, 24 FOREIGN KEY, 20 PRIMARY KEY, 9 UNIQUE.
- 54 public indexes.
- 5 public views and 5 public routines.
- 2 private storage buckets; 2 client-facing storage object policies.
- 4 production Edge Functions.
- One production cron job runs review publication every 5 minutes; keep disabled in staging until safe isolated fixtures and cleanup exist.

## Important design/security notes
- business_photos.business_id is TEXT (not UUID) and currently has no FK; preserve this until code and intended relationship are verified.
- user_subscriptions is user billing; business_subscriptions is a separate business billing path.
- payment_events has a unique provider_event_id safeguard, but current webhook processing order still has idempotency/out-of-order risks documented in EDGE-FUNCTION-SECURITY-REVIEW-2026-11-11-STRIPE-AI.md.
- The two owner analytics views require cross-business isolation tests with at least two disposable staging owners.
- Public submission policies for reviews, complaints and photo records constrain inserts to pending status.
- Keep verification documents private and retain the exact bucket isolation.
- Do not enable the production cron job on staging as-is.

## Outstanding before applying staging baseline
- Capture exact DDL for all constraints and indexes (not only counts).
- Capture table privileges and complete exact routine/view SQL, owners, grants, dependencies.
- Capture exact storage bucket config and object policies in a portable staging form.
- Confirm extension availability and dependency order in staging.
- Reconcile all 20 table columns, 93 constraints, 54 indexes, 35 policies, 5 views, 5 routines.
- Review and generate a staging-only baseline SQL artifact; do not label it as original historical migration source.
- Apply only to staging after full review, then run isolated E2E tests.

## Next execution
Extract exact constraints and indexes in bounded batches, then grants and routine/view definitions. Keep the staging environment untouched until the baseline is complete and reviewed.
