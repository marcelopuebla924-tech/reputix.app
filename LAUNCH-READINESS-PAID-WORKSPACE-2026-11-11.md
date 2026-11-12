# Reputix — Paid Customer Workspace & Launch Readiness

Audit date: 2026-11-11 (Los Angeles time)
Scope: read-only review of the public site, account dashboard, subscription gating, plan catalog, and relevant Supabase access policies.
No customer records, subscriptions, reviews, business records, payment settings, or production secrets were changed.

## Confirmed current state

- The public site has Basic ($13/month) and Pro ($25/month) checkout buttons.
- The current authenticated private area is primarily an account/business-owner workspace, not a dedicated paid-customer workspace.
- The private area currently contains profile, claimed businesses, messaging, complaints, customer reviews for verified businesses, user publications, discovery, and an AI assistant panel.
- Subscription lookup is performed for the signed-in user's own row in the user_subscriptions table.
- The browser currently uses active/trialing subscription status and current period end to show plan state. The Pro AI panel is shown only for Pro in the UI.
- The server-side Reputix AI assistant also checks the user's active Pro subscription. This server-side gate must remain authoritative.
- The owner analytics views filter to the authenticated user's verified business claims and active Basic/Pro subscription. Hourly analytics additionally require Pro and at least three published reviews in a time slot.
- RLS policies currently allow users to read only their own subscription row and own profile; public plan metadata is readable for active plans.
- The plan catalog currently defines:
  - Free: basic profile, reviews/ratings, customer replies.
  - Basic: featured profile, monthly statistics, review trends, business promotions.
  - Pro: everything in Basic, advanced statistics, time comparisons, Reputix AI, performance history.
- The current front-end plan descriptions are generic and do not fully communicate all catalog features.
- The user_subscriptions, user_profiles, and user_publications tables currently contain zero rows. This means no completed user subscription/profile data was found during this audit; it does not prove that checkout or webhook E2E has passed.
- Four RLS-enabled tables have no client policies: business_monthly_history, business_verification_documents, payment_events, and review_ai_moderation. Treat these as private/server-only until every access path is confirmed.
- Supabase Security Advisor still flags two SECURITY DEFINER owner analytics views, two SECURITY DEFINER RPCs, and disabled leaked-password protection. Do not weaken controls or change these settings without a separate reviewed migration and regression plan.

## Product direction: separate the experiences

A paid subscription must unlock the complete feature set of the purchased plan, not administrative privileges and not another user's data.

### 1. General customer workspace
A dedicated, polished private workspace for any signed-in customer, with:
- Overview and account status
- Profile and account settings
- Their own reviews and activity
- Their own conversations and complaints
- Saved/discovered businesses, where the underlying feature and data model are ready
- Subscription and plan details
- Clear upgrade/manage-plan actions

Free users may retain the free account functions. Paid users see the additional tools included in their active plan.

### 2. Business-owner workspace
Keep owner-only tools separate and require a verified owner/authorized representative claim:
- Business profile and business management
- Published customer reviews for verified businesses
- Owner replies and complaint handling
- Basic analytics for active Basic or Pro subscriptions
- Pro-only hourly comparisons, advanced analysis, AI and performance history

A paid customer must not receive owner analytics for a business they have not been verified to represent.

### 3. Pro-only tools
- Reputix AI for eligible subscription users, with server-side plan verification
- Hourly comparison and advanced statistics
- Historical performance reports, once the underlying data pipeline is verified

### 4. Admin-only tools
Keep moderation, claim review, platform analytics and ad administration isolated behind verified server-side admin authorization. A paid subscription must never grant admin role.

## Implementation sequence

1. Map every private feature to its user role and plan entitlement.
2. Build the general customer workspace and keep owner/admin workspaces separate.
3. Replace generic plan copy with an accurate bilingual feature comparison based on the plan catalog.
4. Add a single subscription/entitlement refresh path after checkout return and on session restoration; treat webhook/database state as authoritative.
5. Add secure server-side checks for every paid capability. UI hiding is presentation only, never the security boundary.
6. Verify owner analytics view security and the flagged SECURITY DEFINER RPCs before altering them.
7. Verify server-only access paths for tables without client policies.
8. Run browser regression checks for mobile and desktop, Spanish and English, Free/Basic/Pro, expired/canceled/past-due states, and owner/admin separation.
9. Complete Stripe test-mode success, cancellation, failure, renewal and webhook idempotency tests. Do not run live charges or change live prices/bank/payout settings.

## Non-negotiable safeguards

- Do not delete or alter existing user, business, review, photo, message or payment records.
- Use synthetic test accounts and test-mode payment methods only.
- Do not expose secrets or service-role credentials in the browser or repository.
- Do not grant owner or admin privileges based on payment.
- Do not let advertising influence review content, ratings, rankings or statistics.
- Keep human review for owner verification and moderation decisions.
- Use small changes with regression tests and rollback notes. Stop before destructive or irreversible production actions.
