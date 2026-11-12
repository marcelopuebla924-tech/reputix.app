# Stripe integration — Reputix current status

Last reviewed: 2026-11-11 (America/Los_Angeles)

This document separates code that exists from configuration and live payment behavior that still needs independent verification. Never place Stripe secret keys in GitHub, browser code, or chat.

## Current Supabase Edge Functions

| Function | Observed status | JWT setting | What the deployed code does |
|---|---:|---:|---|
| `create-checkout-session` | ACTIVE, version 8 | Required | Validates the signed-in Supabase user, accepts only `basic` or `pro`, resolves the Price ID server-side from function secrets, and creates a hosted recurring Checkout Session. |
| `stripe-webhook` | ACTIVE, version 3 | Disabled at gateway; signature checked in code | Verifies the Stripe-Signature header, syncs supported subscription/payment events into Reputix, and records provider events. |

The webhook code handles:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

The webhook upserts subscription state into `user_subscriptions` and writes processed event metadata to `payment_events`. It ignores events without the required Reputix user and plan metadata. It does not grant paid access based only on a browser redirect.

## Existing plan configuration recorded in this repository

| Plan | Intended recurring price | Recorded Price ID |
|---|---:|---|
| Basic | $13 USD/month | `price_1UaHTzD2KjPamMkY2Iyhm3qB` |
| Pro | $25 USD/month | `price_1UaHW6D2KjPamMkYKZFz925A` |

These IDs are historical project records, not live verification of the current Stripe catalog or Supabase secrets. Function secret values are not readable through this code review. Confirm both IDs and the key mode in Stripe Dashboard before running a test purchase.

## What is implemented in the browser

- Basic and Pro buttons call `POST /functions/v1/create-checkout-session`.
- The browser sends the selected plan name and signed-in access token; it does not send a Price ID or Stripe secret.
- A logged-out visitor is sent to the Reputix account area instead of opening Checkout.
- The server returns a Checkout URL and the browser redirects to Stripe.

## Remaining payment verification — do not mark complete until tested

1. Confirm the three function secrets exist in the intended Supabase project: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, and `STRIPE_PRICE_PRO`. Do not expose their values.
2. Confirm whether the secrets currently contain Stripe test-mode or live-mode credentials. Keep testing in test mode.
3. In Stripe Dashboard, confirm the webhook endpoint points to the active Supabase `stripe-webhook` function and subscribes to every event listed above.
4. Send a signed test webhook from Stripe and verify that one test subscription is correctly reflected in `user_subscriptions` and `payment_events`.
5. Test Basic and Pro checkout with a dedicated test account and Stripe test payment method. Verify successful payment, failed payment, renewal, and cancellation behavior.
6. Confirm that a failed or incomplete payment never unlocks paid features.
7. Verify the exact return behavior for success and cancellation. The current Edge Function uses the apex host `https://reputixapp.com`; the public site is normally visited at `https://www.reputixapp.com`. Confirm the redirect and session continuity before changing either URL.
8. Confirm Stripe business verification, payout details, tax treatment, refund policy, and live-mode credentials before accepting real payments.

## Known product gaps

- The owner dashboard plan button now truthfully says “Ver planes / View plans”. It scrolls to the plans section; it does not yet open a Stripe Billing Portal.
- Customer self-service cancellation, card updates, invoices, and subscription management are not implemented in Reputix.
- The application does not yet display a dedicated success/cancel confirmation experience after returning from Stripe.
- A deployed webhook function is not proof that the Stripe Dashboard endpoint is configured or that a real signed event has been received.
- Do not advertise billing management as included until the Billing Portal is implemented and tested.

## Safety rules

- Never put Stripe secrets or service-role keys in `app.js`, `index.html`, `checkout.js`, or public repository files.
- Do not switch to live mode or change prices, payout accounts, or webhook destinations without explicit approval.
- Never grant subscription entitlements from query parameters or the success URL alone.
