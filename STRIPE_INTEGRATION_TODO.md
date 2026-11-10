# Stripe integration — Reputix

This file is the single source of truth for the remaining Stripe setup.

## Values to Replace

The endpoint uses environment secrets rather than embedding Stripe credentials or Price IDs in public code.

**Files containing placeholders / configuration references:**
- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| STRIPE_SECRET_KEY | Missing Supabase Function Secret | Add the Stripe **test-mode** secret key from the Stripe Dashboard. Never put it in app.js, index.html, or GitHub. |
| STRIPE_PRICE_BASIC | Missing Supabase Function Secret | Add the actual recurring Price ID for Reputix Basic ($13 USD/month), in the form `price_...`. |
| STRIPE_PRICE_PRO | Missing Supabase Function Secret | Add the actual recurring Price ID for Reputix Pro ($25 USD/month), in the form `price_...`. |

Do not use Product IDs (`prod_...`) in place of Price IDs (`price_...`). Create or verify both recurring monthly prices in Stripe **Sandbox/Test mode** first.

## Configured Parameters

**Files containing these parameters:**
- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page |
| mode | subscription |
| billing_address_collection | auto |
| phone_number_collection.enabled | false |
| automatic_tax.enabled | false |
| allow_promotion_codes | false |
| payment_method_collection | always |
| submit_type | auto |
| name_collection.individual.enabled | true |
| name_collection.business.enabled | true |
| integration_identifier | hosted_mobile_app_0001 |
| origin_context | mobile_app |
| success_url | https://reputixapp.com/?checkout=success&session_id={CHECKOUT_SESSION_ID} |
| cancel_url | https://reputixapp.com/?checkout=cancelled |
| line_items | One recurring Price ID selected server-side from STRIPE_PRICE_BASIC or STRIPE_PRICE_PRO |

## Setup and next steps

1. In Stripe, remain in **Sandbox/Test mode** and open Product catalog.
2. Open Reputix Basic and confirm it has a recurring monthly price of **$13.00 USD**. Copy its Price ID (starts with `price_`).
3. Open Reputix Pro and confirm it has a recurring monthly price of **$25.00 USD**. Copy its Price ID.
4. In Supabase Dashboard, open Project Settings / Edge Function Secrets (or Edge Functions / Secrets) for project `udvsrmfgjfinwbgvhchs`.
5. Add these three secrets: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, and `STRIPE_PRICE_PRO`. Use test-mode values while testing. Do not commit secrets to GitHub.
6. Confirm the installed Stripe SDK version used by the Edge Function. The project did not contain a package manifest or pinned Stripe SDK version when this integration was prepared. The configured `ui_mode: hosted_page` follows the Checkout Studio instructions for SDK 21.0.0 and newer; if the resolved SDK is older than 21.0.0, change it to `hosted`.
7. Connect the Reputix Basic and Pro plan buttons to invoke `POST /functions/v1/create-checkout-session` with a signed-in user's access token and JSON body `{"plan":"basic"}` or `{"plan":"pro"}`. Redirect the browser to the returned `url`. The public browser must never send a Price ID or Stripe secret key.
8. The checkout endpoint is deployed with JWT verification enabled and validates the signed-in user before creating a session. It records the user's Supabase ID and selected plan in Stripe Checkout and Subscription metadata.
9. After successful test payments, add and verify a Stripe webhook before granting paid plan access. Handle at minimum `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, and `customer.subscription.deleted`. Do not grant or renew access based only on the success-page redirect.
10. Test both plans with Stripe test cards (for example, `4242 4242 4242 4242`, any future expiry date, any CVC, and any valid ZIP/postal code). Use test-mode keys and prices only. Test a declined card such as `4000 0000 0000 0002` as well.
11. Before going live, replace the test secret and test Price IDs with live-mode values, complete Stripe business verification, configure the payout bank account, and verify the live webhook endpoint.

## Project structure

- `supabase/functions/create-checkout-session/index.ts` — server-side endpoint that creates a hosted recurring Checkout Session.
- `STRIPE_INTEGRATION_TODO.md` — this setup checklist.

## How the integration works

1. A signed-in Reputix user chooses Basic or Pro.
2. The app calls the Supabase Edge Function with the selected plan name.
3. The server validates the user's Supabase session and maps the plan to its server-side Stripe Price ID.
4. Stripe creates a hosted monthly subscription Checkout Session.
5. The server returns the Checkout URL; the app redirects the user to Stripe.
6. A future verified Stripe webhook must update Reputix's paid entitlement after Stripe confirms payment.

## Current limitations

- The backend Checkout endpoint is deployed, but the Reputix plan buttons are not yet wired to call it.
- The Stripe secret and actual recurring Price IDs have not been supplied as Supabase secrets, so live session creation cannot yet be tested.
- No Stripe webhook or paid-plan entitlement handler was added in this minimal Checkout task.
- No Stripe customer/subscription database table was added because no existing billing persistence pattern was found in the inspected app code.

## Resources

- [Stripe Dashboard — Test mode](https://dashboard.stripe.com/test)
- [Stripe Products and Prices](https://dashboard.stripe.com/test/products)
- [Stripe API keys](https://dashboard.stripe.com/test/apikeys)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- https://support.stripe.com
- https://docs.stripe.com/mcp
