# Reputix Monetization V1
Updated: 2026-11-09 (America/Los_Angeles)

## Business rule
Reputix keeps 100% of advertising revenue. There is no revenue share, payout, or creator monetization program for reviewers or users. Advertising is separate from reviews, ratings, moderation, and business statistics. Advertisers cannot buy, alter, suppress, or improve ratings or review placement.

## Revenue streams
1. Direct local advertising sold by Reputix.
2. Clearly labeled sponsored business placements.
3. Time-limited campaigns (7, 15, or 30 days); campaign prices are to be set by the Reputix administrator.
4. Existing business subscriptions remain separate: Free $0, Basic $13/month, Pro $25/month.

## Existing Supabase foundation (inspected 2026-11-09)
The Reputix Supabase project already contains:
- `ad_campaigns`: campaign, business, placement, budget, dates, and approval status.
- `ad_impressions` and `ad_clicks`: event counters.
- `business_promotions`: owner promotions.
- `monetization_plans` and `business_subscriptions`.
- `payment_events`: payment-provider event records.

Existing ad placements are `business_carousel`, `discovery_feed`, and `category_featured`. Campaign statuses include draft, pending_review, approved, active, paused, completed, and rejected.

The existing subscription plan records already show Basic at 1300 cents and Pro at 2500 cents. Do not create duplicate monetization tables or change these prices.

## Security findings / implementation gates
- Row Level Security is enabled on the monetization tables.
- Public read access is limited to active campaigns within their date window.
- Verified business owners can view their own campaigns.
- There is currently no admin write policy for `ad_campaigns`, and no public tracking insert policy for impressions/clicks.
- `public.is_reputix_admin()` checks the signed JWT app_metadata claim `reputix_role=admin`.
- Before activating an admin dashboard or public tracking, verify that the intended administrator account has this server-managed claim and add narrowly scoped policies / server-side tracking. Never expose a service-role key in browser code.

## V1 build order
1. Build a separate Reputix Ads administration module; do not modify sign-in/sign-up controls or their handlers.
2. Admin campaign workflow: create draft, submit for review, approve/reject, schedule, pause/resume, and view metrics.
3. Public placements: show only approved active campaigns and label each as “Publicidad” / “Sponsored”.
4. Track impressions and clicks through a protected server-side endpoint with basic deduplication and bot safeguards.
5. Add campaign checkout only after payment provider credentials, webhook handling, refund/cancellation rules, and tax/payment details are configured.
6. Test on a staging copy and verify the existing search, owner login, registration, reviews, and statistics remain unchanged before publishing.

## UX and trust rules
- Ads must be visibly labeled and visually distinct from organic results.
- Never present paid placement as an organic recommendation.
- Never use ad spend to affect star ratings, review sorting, moderation, or statistical calculations.
- Do not target ads using sensitive personal information or private review content.
- Report campaign delivery (impressions, clicks, dates, status) to the advertiser.
- Reputix retains all ad revenue; no user/reviewer revenue sharing.
