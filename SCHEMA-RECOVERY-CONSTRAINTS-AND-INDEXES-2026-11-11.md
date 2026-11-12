# Reputix — verified constraints and index catalog
Date: 2026-11-11 (PST)
Source: read-only pg_catalog queries on production project udvsrmfgjfinwbgvhchs.

## Verified counts
Exact fresh pg_constraint aggregation:
- CHECK (c): 40
- FOREIGN KEY (f): 24
- PRIMARY KEY (p): 20
- UNIQUE (u): 9
- Total: 93

Exact fresh pg_indexes count:
- Public indexes: 54

All constraints were confirmed validated in the extracted full catalog output. The source query used pg_get_constraintdef(oid,true); index definitions came from pg_indexes.indexdef. Re-run catalog count checks before baseline application.

## Index inventory (54)
Names captured from pg_indexes:
- ad_campaigns_active_idx
- ad_campaigns_business_idx
- ad_campaigns_pkey
- ad_clicks_campaign_time_idx
- ad_clicks_pkey
- ad_impressions_campaign_time_idx
- ad_impressions_pkey
- business_conversations_business_id_customer_id_subject_key
- business_conversations_business_idx
- business_conversations_customer_idx
- business_conversations_pkey
- business_messages_conversation_idx
- business_messages_pkey
- business_monthly_history_business_id_month_start_key
- business_monthly_history_pkey
- idx_business_monthly_history_business_month
- business_owner_claims_business_id_user_id_key
- business_owner_claims_pkey
- one_verified_owner_per_business
- business_photos_pkey
- business_photos_storage_path_key
- business_promotions_active_idx
- business_promotions_business_idx
- business_promotions_pkey
- business_subscriptions_business_idx
- business_subscriptions_pkey
- business_subscriptions_plan_code_idx
- business_subscriptions_provider_subscription_id_key
- business_subscriptions_status_idx
- business_verification_documents_pkey
- business_verification_documents_storage_path_key
- businesses_active_proposal_unique
- businesses_pkey
- complaints_business_created_idx
- complaints_pkey
- complaints_user_created_idx
- monetization_plans_pkey
- payment_events_business_idx
- payment_events_pkey
- payment_events_provider_event_id_key
- payment_events_status_idx
- review_ai_moderation_pkey
- review_ai_moderation_review_id_key
- reviews_business_visit_date_idx
- reviews_pkey
- reviews_published_business_time_idx
- reviews_published_visit_date_idx
- reviews_status_visit_date_idx
- reviews_user_created_idx
- user_profiles_pkey
- user_publications_pkey
- user_publications_user_created_idx
- user_subscriptions_pkey
- user_subscriptions_provider_subscription_id_key

## Important exact index semantics
- businesses_active_proposal_unique is UNIQUE over lower(btrim(name)), lower(btrim(category)), lower(btrim(city)), COALESCE(lower(btrim(address)), '') and is partial for status pending or approved.
- one_verified_owner_per_business is UNIQUE on business_id WHERE status='verified'.
- reviews_published_business_time_idx and reviews_published_visit_date_idx are partial indexes WHERE status='published'.
- business_subscriptions_provider_subscription_id_key and user_subscriptions_provider_subscription_id_key enforce unique provider subscription IDs.
- payment_events_provider_event_id_key enforces unique provider event IDs.
- business_photos_storage_path_key and business_verification_documents_storage_path_key enforce unique storage paths.
- Preserve all original index predicates, expressions, sort direction, operator class, and uniqueness; do not recreate by name alone.

## Constraint notes from extracted definitions
- Reviews enforce 1–5 bounds on all five rating dimensions; status is pending/published/rejected.
- Complaint text length is 10–5000; status pending/published/rejected/resolved.
- Owner claims constrain relationship_type, verification_level, evidence_type, and status; unique business_id/user_id pair.
- Conversation subject is 1–160 chars; status open/closed; unique business/customer/subject.
- Message body is 1–5000 chars.
- Business proposals have a unique partial index for normalized active proposals.
- Billing plans enforce USD and nonnegative monthly price; subscription tables constrain provider/status/billing interval and reference monetization_plans.
- Payment event processing status is received/processed/failed/ignored.
- AI moderation outcome is clear/needs_review/high_risk/unavailable.
- Business photos status pending/approved/rejected; storage path unique.
- Verification documents status awaiting_upload/pending_review/verified/rejected; storage path unique.
- business_photos.business_id is TEXT without a foreign key. Keep this existing shape; do not silently convert it.

## Extraction limitation / next
The complete catalog query returned 93 constraint definitions; its large output was split into bounded follow-up batches for persistence. The first batch captured definitions for conversations, messages, owner claims, photos, verification documents, businesses, complaints, moderation, reviews and profiles. Remaining batch must capture ad, monthly history, promotions, subscriptions, plans, payments and publications. Before staging baseline generation, persist and reconcile every definition, then exact grants and view/routine DDL.
