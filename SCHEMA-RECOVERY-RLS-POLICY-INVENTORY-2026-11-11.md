# Reputix — RLS policy catalog snapshot
Date: 2026-11-11 (PST)
Source: production Supabase project, read-only catalog query against pg_policies.
Project: udvsrmfgjfinwbgvhchs
Scope: public schema only.
No production data or configuration was modified.

## Verified totals
- 35 policies across 16 public tables.
- All policies are PERMISSIVE.
- Roles are limited to anon/authenticated as listed below.
- Preserve policy names, commands, roles, USING (qual), and WITH CHECK expressions exactly when rebuilding staging. The canonical expressions were captured from pg_policies in this session; do not simplify or broaden them.

## Policy inventory

| Table | Policy | Roles | Command |
|---|---|---|---|
| ad_campaigns | Public can view active approved campaigns | anon, authenticated | SELECT |
| ad_campaigns | Reputix admins manage ad campaigns | authenticated | ALL |
| ad_campaigns | Verified owners view their campaigns | authenticated | SELECT |
| ad_clicks | Reputix admins read ad clicks | authenticated | SELECT |
| ad_impressions | Reputix admins read ad impressions | authenticated | SELECT |
| business_conversations | Customers start conversations with approved businesses | authenticated | INSERT |
| business_conversations | Participants read business conversations | authenticated | SELECT |
| business_messages | Conversation participants read messages | authenticated | SELECT |
| business_messages | Conversation participants send messages | authenticated | INSERT |
| business_messages | Participants mark received messages read | authenticated | UPDATE |
| business_owner_claims | Owners can submit their own pending claims | authenticated | INSERT |
| business_owner_claims | Owners can view their own claims | authenticated | SELECT |
| business_owner_claims | Reputix admins can review owner claims | authenticated | SELECT |
| business_owner_claims | Reputix admins can update owner claims | authenticated | UPDATE |
| business_photos | Public can view approved business photos | anon, authenticated | SELECT |
| business_photos | Users can submit pending business photos | anon, authenticated | INSERT |
| business_promotions | Public can view active promotions | anon, authenticated | SELECT |
| business_promotions | Verified owners manage their promotions | authenticated | ALL |
| business_subscriptions | Verified owners view their business subscriptions | authenticated | SELECT |
| businesses | Anyone can view approved businesses | anon, authenticated | SELECT |
| complaints | Public can read published complaints | anon, authenticated | SELECT |
| complaints | Users can view their own complaints | authenticated | SELECT |
| complaints | Verified owners can respond to complaints for their businesses | authenticated | UPDATE |
| complaints | Verified owners can view complaints for their businesses | authenticated | SELECT |
| complaints | Visitors can submit pending complaints | anon, authenticated | INSERT |
| monetization_plans | Anyone can view active monetization plans | anon, authenticated | SELECT |
| reviews | Anyone can submit pending reviews | anon, authenticated | INSERT |
| reviews | Anyone can view published reviews | anon, authenticated | SELECT |
| reviews | Users can view their own reviews | authenticated | SELECT |
| reviews | Verified owners can view reviews for their businesses | authenticated | SELECT |
| user_profiles | Users can create their own profile | authenticated | INSERT |
| user_profiles | Users can update their own profile | authenticated | UPDATE |
| user_profiles | Users can view their own profile | authenticated | SELECT |
| user_publications | Users manage their own publications | authenticated | ALL |
| user_subscriptions | Users can view their own subscription | authenticated | SELECT |

## Important security observations
- Public business and review reads are constrained to approved/published records.
- Public submissions of reviews, complaints, and business photos are constrained to pending status.
- Owner access depends on verified claims; owner analytics and messaging require careful cross-business isolation tests.
- Admin actions depend on is_reputix_admin(); staging must use disposable admin test identities.
- The business_messages UPDATE policy restricts updates to received messages and checks sender_id differs from auth.uid(); test that clients cannot alter message body or conversation ownership through direct API calls.
- Rebuild the exact captured qual and with_check expressions, not a guessed policy based only on this inventory.

## Next
Extract and persist exact column definitions, defaults, constraints, indexes, and table grants in bounded batches. Reconcile to 20 public tables, 93 constraints, and 54 indexes before generating a reviewed staging-only baseline.
