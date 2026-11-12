# Reputix — Read-only Stripe Integration Review
Date: 2026-11-11
Review window: approximately 17:35–17:37 PDT
Supabase project: `udvsrmfgjfinwbgvhchs`

## Scope and safety
Reviewed repository payment documentation, browser checkout code, the deployed `create-checkout-session` Edge Function, and the deployed `stripe-webhook` Edge Function using read-only access.

No Stripe Dashboard action, Checkout session creation, test charge, webhook delivery, refund, payout, secret read, secret update, database write, or Auth/payment setting change was performed. Secret values were not accessed or exposed.

## Deployed function status (Supabase control plane)
- `create-checkout-session`: ACTIVE, version 8, `verify_jwt=true`.
- `stripe-webhook`: ACTIVE, version 3, `verify_jwt=false` (expected for a webhook endpoint because the function verifies the Stripe signature itself).

These are deployment facts only; they do not prove the Stripe Dashboard endpoint, event subscriptions, secret values, or test/live mode are configured correctly.

## Checkout function review
Positive controls observed:
- Requires a Bearer access token and validates it against Supabase Auth `/auth/v1/user`.
- Accepts only `basic` or `pro`; does not accept a client-supplied Price ID.
- Reads `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, and `STRIPE_PRICE_PRO` from server-side function secrets.
- Creates recurring subscription Checkout sessions and sets `user_id` and `plan` metadata on the Checkout Session and Subscription.
- Uses a fixed allowed-origin list for CORS.
- Does not grant paid access from the browser redirect.

Items still unverified:
- Secret existence and whether the secret key is test-mode or live-mode. Secret values were not read.
- Whether the Price IDs in Supabase secrets still match the intended $13 Basic and $25 Pro Stripe catalog items. Repository records are historical only.
- Whether the Stripe Dashboard webhook destination points to this exact Supabase function URL and subscribes to the intended events.
- Whether a real signed test event is delivered and reflected in Reputix.

## Webhook review
Positive controls observed:
- Rejects non-POST requests and missing signatures.
- Verifies the raw request body against `Stripe-Signature` using `STRIPE_WEBHOOK_SECRET`.
- Uses server-side `SUPABASE_SERVICE_ROLE_KEY` only in the Edge Function to update backend records.
- Retrieves the subscription from Stripe for relevant events.
- Requires `user_id` and a Basic/Pro plan in trusted Stripe metadata before syncing entitlements.
- Upserts `user_subscriptions` by `provider_subscription_id`.
- Records provider event IDs in `payment_events` with duplicate-ignore behavior.
- Does not rely on success/cancel query parameters to grant membership.

Events handled by deployed code:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Potential hardening / validation:
- Consider explicitly checking `event.livemode` against an intentionally configured environment expectation before processing events. This is not currently verified and no secret/configuration was changed.
- Checkout creation does not currently set an explicit idempotency key. Existing UI disables buttons while requests are running, but server-side idempotency could provide additional protection against duplicate Checkout sessions on retries.
- Validate failure, renewal, cancellation, and duplicate-event delivery with Stripe test mode and a dedicated synthetic account before production.

## Browser checkout and customer experience
- Both plan buttons are present and call the hosted Checkout flow.
- The browser refreshes an expired Supabase session once after a 401 and retries checkout with the new token (covered by mocked Browser QA).
- The success/cancel URLs currently use the apex host `https://reputixapp.com`, while the public site is commonly accessed at `https://www.reputixapp.com`. These are different browser origins, so `sessionStorage` does not carry between them. The application also has no dedicated success/cancel confirmation screen.
- Do not change the return URLs or domain/DNS without explicit approval. Decide the canonical return origin and verify session continuity in Stripe test mode first.
- A Billing Portal, member cancellation, payment-method updates, invoices, and subscription self-service are not implemented. Do not promise these features to paying customers yet.

## Current conclusion
**Stripe is integrated in code, but payments are not certified for launch.** The deployed functions and code paths exist; live/test mode, secret configuration, Stripe Dashboard webhook routing, real signed delivery, real test checkout, and lifecycle behavior remain unverified.

## Required next verification
1. Confirm Stripe is in test mode before any checkout attempt; never use live mode for QA.
2. Confirm server-side secret presence without exposing values; verify mode and intended plan mapping in Stripe Dashboard.
3. Verify the webhook destination and event list.
4. Run a dedicated test-account checkout for Basic and Pro using Stripe test payment methods.
5. Test successful payment, failed payment, renewal, cancellation, and duplicate webhook delivery.
6. Confirm only the webhook-backed active/trialing subscription state unlocks paid features.
7. Resolve the canonical success/cancel return origin and add a clear confirmation experience after approval.

## Protected items left untouched
Stripe live mode, prices, Price IDs, payout/bank details, webhook destination, Supabase function secrets, production subscriptions, payment records, and the Reputix domain/DNS.
