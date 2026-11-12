# Reputix — exact public RLS policy expressions
**Date:** 2026-11-11  
**Time:** 9:05 p.m. Pacific (Los Angeles)  
**Source:** fresh read-only `pg_policies` query on production `udvsrmfgjfinwbgvhchs`.

## Safety
No production policies, grants, schema, rows, Auth, Storage, Stripe, or domain settings were changed. Staging remains empty. All 35 policies returned PERMISSIVE.

Notation: `USING` and `WITH CHECK` reproduce the catalog expressions semantically; blank means NULL in pg_policies.

## Exact policy inventory (35)

### ad_campaigns
1. `Public can view active approved campaigns` — anon, authenticated; SELECT. USING: `status = 'active' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())`.
2. `Reputix admins manage ad campaigns` — authenticated; ALL. USING and WITH CHECK: `is_reputix_admin()`.
3. `Verified owners view their campaigns` — authenticated; SELECT. USING: EXISTS business_owner_claims c where c.business_id=ad_campaigns.business_id AND c.user_id=(SELECT auth.uid()) AND c.status='verified'.

### ad_clicks
4. `Reputix admins read ad clicks` — authenticated; SELECT. USING: `is_reputix_admin()`.

### ad_impressions
5. `Reputix admins read ad impressions` — authenticated; SELECT. USING: `is_reputix_admin()`.

### business_conversations
6. `Customers start conversations with approved businesses` — authenticated; INSERT. WITH CHECK: `customer_id=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM businesses b WHERE b.id=business_conversations.business_id AND b.status='approved')`.
7. `Participants read business conversations` — authenticated; SELECT. USING: `customer_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM business_owner_claims c WHERE c.business_id=business_conversations.business_id AND c.user_id=(SELECT auth.uid()) AND c.status='verified')`.

### business_messages
8. `Conversation participants read messages` — authenticated; SELECT. USING: EXISTS business_conversations c where c.id=business_messages.conversation_id AND (c.customer_id=(SELECT auth.uid()) OR EXISTS business_owner_claims claim where claim.business_id=c.business_id AND claim.user_id=(SELECT auth.uid()) AND claim.status='verified').
9. `Conversation participants send messages` — authenticated; INSERT. WITH CHECK: `sender_id=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM business_conversations c WHERE c.id=business_messages.conversation_id AND (c.customer_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM business_owner_claims claim WHERE claim.business_id=c.business_id AND claim.user_id=(SELECT auth.uid()) AND claim.status='verified')))`.
10. `Participants mark received messages read` — authenticated; UPDATE. USING: `sender_id<>(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM business_conversations c WHERE c.id=business_messages.conversation_id AND (c.customer_id=(SELECT auth.uid()) OR EXISTS (SELECT 1 FROM business_owner_claims claim WHERE claim.business_id=c.business_id AND claim.user_id=(SELECT auth.uid()) AND claim.status='verified')))`. WITH CHECK: `sender_id<>(SELECT auth.uid())`.

### business_owner_claims
11. `Owners can submit their own pending claims` — authenticated; INSERT. WITH CHECK: `user_id=(SELECT auth.uid()) AND status='pending'`.
12. `Owners can view their own claims` — authenticated; SELECT. USING: `user_id=(SELECT auth.uid())`.
13. `Reputix admins can review owner claims` — authenticated; SELECT. USING: `is_reputix_admin()`.
14. `Reputix admins can update owner claims` — authenticated; UPDATE. USING: `is_reputix_admin()`. WITH CHECK: `is_reputix_admin() AND status IN ('pending','activity_verified','responsible_verified','verified','rejected')`.

### business_photos
15. `Public can view approved business photos` — anon, authenticated; SELECT. USING: `status='approved'`.
16. `Users can submit pending business photos` — anon, authenticated; INSERT. WITH CHECK: `status='pending'`.

### business_promotions
17. `Public can view active promotions` — anon, authenticated; SELECT. USING: `status='active' AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now())`.
18. `Verified owners manage their promotions` — authenticated; ALL. USING and WITH CHECK: EXISTS business_owner_claims c where c.business_id=business_promotions.business_id AND c.user_id=(SELECT auth.uid()) AND c.status='verified'.

### business_subscriptions
19. `Verified owners view their business subscriptions` — authenticated; SELECT. USING: EXISTS business_owner_claims c where c.business_id=business_subscriptions.business_id AND c.user_id=(SELECT auth.uid()) AND c.status='verified'.

### businesses
20. `Anyone can view approved businesses` — anon, authenticated; SELECT. USING: `status='approved'`.

### complaints
21. `Public can read published complaints` — anon, authenticated; SELECT. USING: `status='published'`.
22. `Users can view their own complaints` — authenticated; SELECT. USING: `user_id=(SELECT auth.uid())`.
23. `Verified owners can respond to complaints for their businesses` — authenticated; UPDATE. USING and WITH CHECK: EXISTS business_owner_claims c JOIN businesses b ON b.id=c.business_id where c.business_id=complaints.business_id AND c.user_id=(SELECT auth.uid()) AND c.status='verified' AND b.status='approved'.
24. `Verified owners can view complaints for their businesses` — authenticated; SELECT. USING: EXISTS business_owner_claims c where c.business_id=complaints.business_id AND c.user_id=(SELECT auth.uid()) AND c.status='verified'.
25. `Visitors can submit pending complaints` — anon, authenticated; INSERT. WITH CHECK: `status='pending' AND (user_id IS NULL OR user_id=(SELECT auth.uid()))`.

### monetization_plans
26. `Anyone can view active monetization plans` — anon, authenticated; SELECT. USING: `is_active=true`.

### reviews
27. `Anyone can submit pending reviews` — anon, authenticated; INSERT. WITH CHECK: `status='pending' AND (user_id IS NULL OR user_id=(SELECT auth.uid()))`.
28. `Anyone can view published reviews` — anon, authenticated; SELECT. USING: `status='published'`.
29. `Users can view their own reviews` — authenticated; SELECT. USING: `user_id=(SELECT auth.uid())`.
30. `Verified owners can view reviews for their businesses` — authenticated; SELECT. USING: EXISTS business_owner_claims c where c.business_id=reviews.business_id AND c.user_id=(SELECT auth.uid()) AND c.status='verified'.

### user_profiles
31. `Users can create their own profile` — authenticated; INSERT. WITH CHECK: `user_id=(SELECT auth.uid())`.
32. `Users can update their own profile` — authenticated; UPDATE. USING and WITH CHECK: `user_id=(SELECT auth.uid())`.
33. `Users can view their own profile` — authenticated; SELECT. USING: `user_id=(SELECT auth.uid())`.

### user_publications
34. `Users manage their own publications` — authenticated; ALL. USING and WITH CHECK: `user_id=(SELECT auth.uid())`.

### user_subscriptions
35. `Users can view their own subscription` — authenticated; SELECT. USING: `(SELECT auth.uid())=user_id`.

## Rebuild cautions
- This is the exact fresh policy inventory from production; the canonical SQL catalog expressions use schema-resolved references and nested EXISTS queries. Preserve their predicates and command/role mapping; do not loosen or consolidate them during staging.
- Policies are PERMISSIVE. Multiple SELECT policies combine with OR semantics; do not treat each as a mandatory AND condition.
- The `business_messages` UPDATE policy has both USING and WITH CHECK; its grant is column-scoped to read_at only for authenticated. Both layers are required.
- `is_reputix_admin()` relies on trusted JWT `app_metadata`, not user-editable metadata.
- Public submission policies constrain new reviews/complaints/photos to pending status. Preserve these constraints and test abuse/validation.
- Owner-related policies require verified owner claims. Use at least two synthetic owners to test cross-business isolation.
- This file documents public-schema RLS only. Storage object policies are separately recorded in `STAGING-RECOVERY-MESSAGING-STORAGE-CRON-2026-11-11-2102-PST.md`.

## Status
The 35-policy catalog is now persisted alongside the 20-table column/constraint/index batches, ACL inventory, routine/view inventory, Storage metadata, and scheduler record. Staging is still empty. Do not apply a baseline until extension/dependency and full effective-grant reconciliation and rollback review are complete.
