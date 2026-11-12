# Reputix — Advertising Module Readiness Review
Date: 2026-11-11
Review time: approximately 17:37 PDT
Supabase project: `udvsrmfgjfinwbgvhchs`

## Scope and safety
Read-only review of `index.html`, `app.js`, deployed Edge Function inventory, and public database metadata/policies for `ad_campaigns`, `ad_impressions`, `ad_clicks`, and `business_promotions`.

No ad campaigns, impressions, clicks, business promotions, payments, database objects, policies, or production records were created or changed.

## What exists
- Admin-only campaign manager in the private Reputix admin panel.
- Admin can choose an approved business, enter title/description/destination, select placement, budget, and schedule.
- Campaign creation sets `status='pending_review'`.
- Admin can manually change campaign state (send for review, activate, pause, reject, complete).
- Admin dashboard counts campaigns and reads impression/click counts.
- The UI explicitly says campaign creation does not activate billing.
- RLS lets anon/authenticated users read only active campaigns within their date window. Verified owners can read campaigns for their verified businesses. Admins manage campaigns.
- Impression and click tables are readable only by Reputix admins. No public insert policy was found.
- The public frontend contains no references to `ad_campaigns`, `ad_impressions`, `ad_clicks`, or `business_promotions`. No public ad renderer, impression tracker, click tracker, or ad-serving Edge Function was found in the deployed function inventory.

## Conclusion
**Advertising is an admin campaign-management prototype, not a working monetized ad network yet.** Campaigns can be drafted and manually activated, but the current public site does not render sponsored campaigns or record impressions/clicks. No ad billing is connected.

Business promotions have public SELECT policies for active, date-valid rows, but the current frontend does not query or render them either.

## Required work before advertising can be sold
1. Define clearly labeled sponsored placements and a public ad-serving flow that cannot alter organic reviews, search relevance, or rankings.
2. Add server-side impression/click recording with bot filtering, deduplication, and campaign/date/status checks. Do not open direct public table INSERT privileges.
3. Define owner authorization for campaign creation and approval workflow, while keeping admin approval controls.
4. Connect budgets to a safe payment/billing lifecycle. Do not mark a campaign paid or deliver billable impressions solely from browser-side values.
5. Add reporting that reconciles served impressions/clicks against server-side events and budget limits.
6. Add tests for public rendering, campaign status/date filtering, attribution, duplicate clicks, pause/end behavior, and billing failure.
7. Keep sponsored content visibly labeled and independent from organic review scores and rankings.

## Protected items left untouched
All campaigns, budgets, payment records, table grants, RLS policies, database schema, Stripe settings, and existing business/review data.
