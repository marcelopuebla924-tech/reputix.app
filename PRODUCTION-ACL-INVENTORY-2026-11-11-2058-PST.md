# Reputix — explicit production ACL inventory checkpoint
**Date:** 2026-11-11  
**Time:** 8:58 p.m. Pacific (Los Angeles)  
**Project:** `udvsrmfgjfinwbgvhchs`

## Scope and safety
Read-only inspection of explicit relation ACLs using `aclexplode(relacl)` for public tables/views. No grants, RLS policies, rows, schema, Auth, Storage, Stripe, or domain settings were changed.

## Explicit ACLs observed
Notation lists explicit privileges by grantee. `all` below means DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE as returned by PostgreSQL 17 ACL expansion. Omitted grantees had no explicit ACL entry for that object.

- ad_campaigns: anon = MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE; authenticated = all; postgres = all; service_role = all.
- ad_clicks: authenticated = SELECT; postgres = all; service_role = all.
- ad_impressions: authenticated = SELECT; postgres = all; service_role = all.
- business_conversations: authenticated = SELECT; postgres = all; service_role = all.
- business_hourly_patterns (view): anon/authenticated/postgres/service_role = all.
- business_messages: authenticated = SELECT; postgres = all; service_role = all.
- business_monthly_history: postgres = all; service_role = all.
- business_owner_claims: anon = DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE; authenticated = all; postgres = all; service_role = all.
- business_photos: anon/authenticated/postgres/service_role = all.
- business_promotions: anon/authenticated/postgres/service_role = all.
- business_subscriptions: anon/authenticated = MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE; postgres = all; service_role = all.
- business_verification_documents: postgres = all; service_role = all.
- businesses: anon/authenticated = DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE; postgres = all; service_role = all.
- complaints: anon/authenticated = INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE; postgres = all; service_role = all.
- monetization_plans: anon/authenticated = MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE; postgres = all; service_role = all.
- owner_business_dashboard (view): authenticated = SELECT; postgres = all; service_role = all.
- owner_business_hourly_patterns (view): authenticated = SELECT; postgres = all; service_role = all.
- payment_events: postgres = all; service_role = all.
- recent_review_highlights (view): anon/authenticated/postgres/service_role = all.
- review_ai_moderation: postgres = all; service_role = all.
- reviews: anon/authenticated = DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE; postgres = all; service_role = all.
- user_profiles: anon/authenticated/postgres/service_role = all.
- user_publications: anon/authenticated/postgres/service_role = all.
- user_subscriptions: anon/authenticated = MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE; postgres = all; service_role = all.
- weekly_business_rankings (view): anon/authenticated/postgres/service_role = all.

## Critical interpretation
- These are explicit relation ACL entries, not proof that a role can read or modify every row. RLS is enabled on all 20 public base tables, and row-level policies still govern table access.
- Several relations expose broad SQL privileges to anon/authenticated while depending on RLS to deny unauthorized writes or rows. This must be preserved accurately for staging first, then independently reviewed for least privilege.
- The owner analytics views have narrower explicit grants: authenticated SELECT only, with no anon grant; service_role/postgres retain all.
- The messaging tables show authenticated SELECT only at table level in this ACL snapshot. A separate column-level grant audit documented scoped INSERT and UPDATE only on business_messages.read_at; preserve and reconcile both table-level and column-level grants.
- Do not assume that revoking broad table grants is safe: application flows may depend on scoped column grants and RLS policies. Validate real API operations using synthetic staging users before proposing any changes.
- PostgreSQL 17 exposes MAINTAIN as an ACL privilege; include it when comparing grants and do not silently omit it from the staging inventory.

## Next
1. Reconcile these direct ACLs with column-level privileges and all 35 RLS policies.
2. Preserve service_role-only tables (business_monthly_history, business_verification_documents, payment_events, review_ai_moderation) unless verified backend call paths require otherwise.
3. Add isolated positive/negative RLS tests before proposing any least-privilege grant changes.
4. No production grant or policy changes are authorized by this audit; no DDL should be applied to staging until full object inventory and rollback review are complete.
