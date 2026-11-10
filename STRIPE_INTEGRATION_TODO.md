# Stripe integration — Reputix

This file is the single source of truth for the remaining Stripe setup.

## Values to Replace

The existing Checkout Session call is already present in the Supabase Edge Function. Its real success URL, cancel URL, recurring subscription mode, and server-side Price ID lookup are preserved.

**Files containing configuration references:**
- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| STRIPE_SECRET_KEY | Missing Supabase Function Secret | Add the Stripe **test-mode** secret key from Stripe Dashboard → Developers / API keys. Never put it in app.js, index.html, or GitHub. |
| STRIPE_PRICE_PRO | Missing Supabase Function Secret | Add the actual recurring monthly Price ID for Reputix Pro ($25 USD/month), in the form `price_...`. |

**Already identified:**
- `STRIPE_PRICE_BASIC` = `price_1UaHTzD2KjPamMkY2Iyhm3qB` (Reputix Basic, $13 USD/month). Add this exact value as a Supabase Function Secret named `STRIPE_PRICE_BASIC`.

Do not use Product IDs (`prod_...`) in place of Price IDs (`price_...`). Keep Stripe in **Sandbox/Test mode** while testing.

## Configured Parameters

These Checkout Studio parameters are already present in the existing Checkout Session creation call.

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

The existing `mode`, `success_url`, `cancel_url`, and `line_items` behavior was preserved. No duplicate Checkout endpoint was created and no surrounding application code was refactored.

## Setup and next steps

1. In Stripe, remain in **Sandbox/Test mode**.
2. Add the Basic Price ID secret: `STRIPE_PRICE_BASIC=price_1UaHTzD2KjPamMkY2Iyhm3qB`.
3. Open Reputix Pro in Product catalog, confirm its recurring monthly price is **$25.00 USD**, and copy its Price ID (starts with `price_`). Add it in Supabase as `STRIPE_PRICE_PRO`.
4. Add `STRIPE_SECRET_KEY` in Supabase Function Secrets using the Stripe **test-mode secret key**. Never share it in chat or commit it to GitHub.
5. In Supabase Dashboard, open Project Settings / Edge Function Secrets (or Edge Functions / Secrets) for project `udvsrmfgjfinwbgvhchs`. Add all three secrets: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, and `STRIPE_PRICE_PRO`.
6. The existing Edge Function `create-checkout-session` is **ACTIVE** with JWT verification enabled. The repository does not pin a Stripe SDK version. Confirm the resolved Stripe SDK version: SDK 21.0.0 and newer use `ui_mode: "hosted_page"`; older versions use `"hosted"`. Do not guess or change the value until the installed version is confirmed.
7. Connect the Reputix Basic and Pro plan buttons to invoke `POST /functions/v1/create-checkout-session` with a signed-in user's access token and JSON body `{"plan":"basic"}` or `{"plan":"pro"}`. Redirect the browser to the returned `url`. The browser must never send a Price ID or Stripe secret key.
8. The endpoint validates the signed-in Supabase user before creating a session. It records the user's Supabase ID and selected plan in Stripe Checkout and Subscription metadata.
9. After successful test payments, add and verify a Stripe webhook before granting paid plan access. Handle at minimum `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, and `customer.subscription.deleted`. Do not grant or renew access based only on the success-page redirect.
10. Test both plans with Stripe test cards (for example, `4242 4242 4242 4242`, any future expiry date, any CVC, and any valid ZIP/postal code). Test a declined card such as `4000 0000 0000 0002` as well.
11. Before going live, replace test-mode keys and Price IDs with live-mode values, complete Stripe business verification, configure the payout bank account, and verify the live webhook endpoint.

## Project structure

- `supabase/functions/create-checkout-session/index.ts` — existing server-side endpoint that creates a hosted recurring Checkout Session.
- `STRIPE_INTEGRATION_TODO.md` — this setup checklist.

## How the integration works

1. A signed-in Reputix user chooses Basic or Pro.
2. The app calls the Supabase Edge Function with the selected plan name.
3. The server validates the user's Supabase session and maps the plan to its server-side Stripe Price ID.
4. Stripe creates a hosted monthly subscription Checkout Session.
5. The server returns the Checkout URL; the app redirects the user to Stripe.
6. A verified Stripe webhook must update Reputix's paid entitlement after Stripe confirms payment.

## Current status and limitations

- The existing Checkout Session API call was found in the codebase (Scenario A). Its Checkout Studio parameters already match the requested values, so the call itself was left unchanged.
- Supabase Edge Function `create-checkout-session` is **ACTIVE** (version 1) with JWT verification enabled.
- The Basic Price ID has been identified from Stripe Sandbox: `price_1UaHTzD2KjPamMkY2Iyhm3qB`. It still needs to be added as the `STRIPE_PRICE_BASIC` Supabase secret.
- The Pro Price ID and Stripe test secret key still need to be added as Supabase secrets.
- The repository does not show a pinned Stripe SDK version; verify the version before deciding whether `hosted_page` or `hosted` is required.
- The Reputix plan buttons still need to be wired to call this endpoint.
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
