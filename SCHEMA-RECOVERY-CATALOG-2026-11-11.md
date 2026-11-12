# Reputix schema recovery — catalog extraction 2026-11-11

## Read-only extraction completed
Production project `udvsrmfgjfinwbgvhchs` was queried through PostgreSQL catalogs. No production writes were issued.

Captured directly from catalogs:
- All five public view definitions, their `reloptions`, and exact SQL.
- All five public routine definitions, argument signatures, SECURITY DEFINER flags, and configured search_path.
- Full public policy inventory query issued (35 policies expected from prior inventory).
- Full public index inventory query issued (54 indexes expected from prior inventory).
- Full public constraint inventory query issued (FKs, checks, PKs, unique constraints).
- Per-table JSON extraction of column names, exact PostgreSQL types, nullability, defaults, constraints, indexes, and RLS flags for the 20 public tables.

## Important verified details
- `business_hourly_patterns`, `recent_review_highlights`, `weekly_business_rankings` are `security_invoker=true`.
- `owner_business_dashboard` and `owner_business_hourly_patterns` have no `security_invoker` reloption; both use auth.uid(), verified owner claims, approved businesses, and active/trialing subscription filters. Hourly owner view additionally requires Pro and at least 3 reviews/hour.
- `is_reputix_admin()` is invoker with empty search_path and checks JWT app_metadata.reputix_role.
- `submit_business_proposal(...)` is SECURITY DEFINER with empty search_path, validates fields, checks duplicate pending/approved businesses, and inserts status pending.
- `owner_respond_to_complaint(uuid,text)` is SECURITY DEFINER with search_path public; it checks auth.uid(), validates response length, and requires verified owner claim.
- `reputix_publish_valid_reviews()` is SECURITY DEFINER with search_path public; it publishes valid pending reviews older than 24 hours for approved businesses.
- `refresh_business_monthly_history(date)` is invoker with empty search_path and upserts monthly aggregates.
- `business_photos.business_id` remains text, with no FK constraint in the catalog. Do not normalize this field without compatibility analysis.
- Staging remains empty and isolated. No migration applied.

## Recovery status
The live catalog now provides enough authoritative material to draft a staging baseline, but final assembly still needs validation of all 20 table definitions, policies, grants, storage bucket/policy metadata, extensions, sequences/identity behavior, and view/function dependency ordering. The query output was bounded by the connector and some large inventories may be truncated in chat; repeat them in table-specific batches before generating executable SQL.

## Safety decision
Do not deploy a guessed baseline. Keep production untouched. Do not copy data, users, credentials, Stripe secrets, service-role keys, or scheduled production jobs to staging. The production security advisor still flags two SECURITY DEFINER views, two exposed SECURITY DEFINER RPC patterns, four RLS/no-policy tables, and disabled leaked-password protection. These findings are not silently changed as part of staging recovery.
