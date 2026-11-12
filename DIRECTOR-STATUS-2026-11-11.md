# Reputix — Director status (2026-11-11, America/Los_Angeles)

## Operating rules
- Preserve working features; do not delete user data, accounts, reviews, businesses, or photos.
- Do not change the domain, identity, Stripe live mode, prices, payout settings, or sensitive authentication settings without explicit approval.
- Do not manipulate review content, review scores, or business statistics.
- Do not approve unverified business owners or identity documents.
- Do not run database mutations until impact and recovery have been reviewed.
- Keep Stripe secrets, service-role keys, and API credentials out of GitHub and browser code.

## Verified starting point
- Repository: marcelopuebla924-tech/reputix.app
- Branch: main
- Current inspected commit: 2062cf3963af06fbd03fad21f53ed1cdec94225f
- GitHub Actions workflow: Reputix Browser QA
- Latest run for the inspected commit: completed successfully.
- Current browser suite contains 17 checks. These are browser/UI smoke tests; admin moderation and advertising workflows use mocked data. Passing these checks does not prove live email delivery, real authentication, real database permissions, Stripe payment processing, or public ad delivery.
- Supabase project: Reputix (udvsrmfgjfinwbgvhchs), region us-east-2, status ACTIVE_HEALTHY.
- Active Edge Functions observed: reputix-ai (v21), tamos-cover-once (v10), create-checkout-session (v8), stripe-webhook (v3).
- Custom domain and CNAME must remain unchanged.

## Completed in the current inspected codebase
- Language selector null-error fixes.
- Plans navigation.
- Business-claim confirmation and session-preservation fixes.
- Cache versioning.
- Browser smoke coverage for search, reviews, AI panel, account validation, checkout logged-out behavior, owner claim flow, admin moderation/ads UI, feature navigation, and mobile map controls.
- Admin Ads page routes to the integrated private Reputix panel.
- Stripe Checkout and webhook Edge Functions are deployed. Deployment alone is not proof that the Stripe Dashboard webhook is configured or that payments have been tested.

## High-priority security review findings (read-only Supabase advisors)
1. ERROR: SECURITY DEFINER views detected:
   - public.owner_business_dashboard
   - public.owner_business_hourly_patterns
2. WARN: SECURITY DEFINER RPC functions executable by public/anonymous and/or authenticated roles:
   - public.submit_business_proposal(...)
   - public.owner_respond_to_complaint(...)
   Their intended public/authenticated access and internal authorization checks must be reviewed before changing grants.
3. INFO: RLS enabled but no policies found on:
   - public.business_monthly_history
   - public.business_verification_documents
   - public.payment_events
   - public.review_ai_moderation
   Determine whether service-role-only access is intentional before adding policies.
4. WARN: leaked-password protection is disabled. Treat as an Auth security setting; do not change without configuration review and approval.
5. Performance advisor found five foreign keys without covering indexes. Review workload and migration/recovery plan before adding indexes.
6. Do not remove unused indexes solely because the advisor reports no observed use; collect workload context first.


## Security finding triage (read-only SQL review)
- Both owner dashboard views currently have SELECT grants for anon and authenticated roles and are ordinary SECURITY DEFINER views (no security_invoker option).
- Their definitions explicitly filter through auth.uid(), require a verified owner claim, an approved business, and an active/trialing subscription. The hourly view additionally requires Pro and at least three published reviews per hour. An anonymous caller has auth.uid() = NULL and therefore should not satisfy the owner filter. This reduces the immediate exposure concern, but the views still bypass underlying-table RLS and should be hardened or formally accepted with regression tests.
- public.submit_business_proposal(...) is executable by anon and authenticated. Its function body validates required fields and maximum lengths, then inserts the business with status='pending'; it does not approve the business. This appears intentional for public business proposals, but abuse/rate limiting should be reviewed.
- public.owner_respond_to_complaint(...) is executable only by authenticated (not anon). Its function checks auth.uid(), validates response length, and updates only a complaint belonging to a business with a verified owner claim. The advisor warning reflects SECURITY DEFINER, but the function contains an ownership check.
- The four RLS-enabled/no-policy tables have no policies. The browser app does not directly reference these tables/views by table name. Current backend patterns use service-role access for moderation and payment event handling. This may be intentional service-role-only design; verify each writer/reader before changing it.
- No database changes were made. No policies, grants, views, functions, authentication settings, or data were modified.

## Director execution order
### P0 — Security and access review (read-only first)
- Inspect definitions, grants, and RLS policies for the two SECURITY DEFINER views and the two RPC functions.
- Confirm whether the four RLS/no-policy tables are intentionally service-role-only.
- Review Auth leaked-password protection configuration.
- Prepare a least-privilege remediation plan with rollback SQL; do not apply database changes until impact/recovery review is complete.

### P1 — Real account and ownership workflow
- Test actual sign-up, confirmation email, sign-in, session persistence, password recovery, and sign-out with a dedicated test account.
- Test a real owner claim end-to-end without approving it or bypassing evidence checks.
- Verify the approved Carolina Fashion Boutique photo and social links on the live dynamic card; do not repeat earlier table/permission checks without a specific failure.

### P2 — Stripe test mode
- Verify presence and mode of STRIPE_SECRET_KEY, STRIPE_PRICE_BASIC, STRIPE_PRICE_PRO, and STRIPE_WEBHOOK_SECRET without exposing values.
- Confirm the Stripe Dashboard webhook destination and subscribed events.
- Test Basic ($13/month) and Pro ($25/month) in test mode, including success, failure, renewal, and cancellation.
- Confirm unpaid/incomplete subscriptions never unlock paid access.
- Do not switch to live mode, change prices, payouts, or webhook destination without explicit approval.
- Customer Billing Portal, cancellation/card updates/invoices, and dedicated success/cancel return screens remain product gaps.

### P3 — Advertising delivery and billing
- Validate approved campaign creation, moderation, placement, public rendering, impression/click tracking, campaign stop/pause, and billing behavior against real data.
- Preserve editorial independence: ads must never influence reviews, rankings, scores, or statistics.

### P4 — Delivery and legal readiness
- Review privacy policy, terms, moderation/appeals, business verification, advertising disclosures, refund/cancellation terms, and support contact.
- Re-run browser tests after every code change and verify deployment before declaring completion.

## Current launch assessment
The front-end has a passing automated smoke suite and deployed backend functions, but Reputix is NOT yet verified as production-ready. Real account flows, ownership verification, Stripe test transactions/webhook delivery, ad delivery/billing, and the listed security findings remain open.
