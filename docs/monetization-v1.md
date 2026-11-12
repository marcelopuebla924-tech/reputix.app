# Reputix Monetization V1

Updated: 2026-11-11 (America/Los_Angeles)

## Business rule

Reputix keeps 100% of advertising revenue. There is no revenue share, payout, or creator monetization program for reviewers or users. Advertising is separate from reviews, ratings, moderation, and business statistics. Advertisers cannot buy, alter, suppress, or improve ratings or review placement.

## Revenue streams

1. Business subscriptions: Free/public access, Basic $13/month, Pro $25/month.
2. Direct local advertising sold by Reputix.
3. Clearly labeled sponsored business placements, only after public delivery and tracking are implemented.
4. Time-limited campaigns (7, 15, or 30 days); campaign prices remain an administrator decision and are not yet exposed as a live checkout product.

## Current implementation status

### Subscriptions
- Browser plan buttons call the Supabase `create-checkout-session` Edge Function.
- Supabase function is ACTIVE (version 8) and validates the signed-in user and allowed plan.
- Supabase `stripe-webhook` is ACTIVE (version 3); its code verifies Stripe signatures and handles checkout, subscription lifecycle, and invoice payment events.
- Live Stripe Dashboard webhook configuration, current function secrets, test purchases, payout setup, and live-mode readiness still require verification.
- The plan button in the owner dashboard only opens the plan section. A self-service Billing Portal is not implemented.

### Reputix Ads administration
- The owner/admin interface includes campaign creation, review-status transitions, and campaign/impression/click counters.
- The campaign creation form sends new campaigns as `pending_review`; its own message explicitly states that ad billing is not active.
- Current RLS includes an admin-management policy on `ad_campaigns`, an admin read policy for `ad_impressions` and `ad_clicks`, and a verified-owner read policy for campaigns.
- Public read access is restricted to active campaigns within their scheduled dates.
- Public impression/click insertion and a protected tracking endpoint are not currently confirmed.
- Public ad placements are not yet connected to the homepage/map discovery experience. Admin campaign management does not mean an ad is being delivered to customers.

## Remaining implementation gates

1. Connect approved, active campaigns to clearly labeled public placements.
2. Add protected server-side impression and click tracking, deduplication, and basic bot safeguards. Do not expose service-role credentials in the browser.
3. Verify metrics are populated and match actual delivery before showing campaign performance to advertisers.
4. Add advertiser billing only after payment credentials, webhook handling, refunds, cancellations, and tax/payment details are configured and tested.
5. Confirm the intended admin account has the server-managed `reputix_role=admin` claim before using administrative controls.
6. Test the entire ad lifecycle on a staging/test environment before public launch.

## UX and trust rules

- Ads must be visibly labeled “Publicidad” / “Sponsored”.
- Never present paid placement as an organic recommendation.
- Never use ad spend to affect star ratings, review sorting, moderation, or statistical calculations.
- Do not target ads using sensitive personal information or private review content.
- Reputix keeps all ad revenue; no user/reviewer revenue sharing.
