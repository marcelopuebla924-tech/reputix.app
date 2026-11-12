# Edge Function source review — Reputix
Date: 2026-11-11, 8:30 p.m. PST

## Scope and safety
Read-only source inspection of production Edge Function `create-checkout-session` v8. No deployment, secret reads, secret changes, Stripe calls, or production writes were performed. Secret VALUES were not recorded.

## create-checkout-session v8 findings
- verify_jwt=true.
- Accepts POST and OPTIONS; requires a Bearer session and independently validates it through Supabase Auth `/auth/v1/user`.
- Accepts only plan codes `basic` and `pro`.
- Reads environment variable names:
  - SUPABASE_URL
  - SUPABASE_PUBLISHABLE_KEYS (fallback SUPABASE_ANON_KEY)
  - STRIPE_SECRET_KEY
  - STRIPE_PRICE_BASIC
  - STRIPE_PRICE_PRO
- Creates hosted Stripe subscription Checkout Session with selected price ID and metadata user_id/plan.
- Uses CORS allowlist: https://reputixapp.com, https://www.reputixapp.com, https://marcelopuebla924-tech.github.io.
- Success/cancel URLs currently point to https://reputixapp.com (apex domain), while the primary configured domain also includes www. Test redirect and canonical-domain behavior before any change.
- Checkout is user-plan based (basic/pro) and stores user_id metadata. The separate business_subscriptions table exists; verify intended linkage and webhook reconciliation before considering checkout flow complete.
- Function returns generic error messages to client and logs Stripe failures without exposing error details.

## Required staging configuration (names only)
Use separate staging values and Stripe TEST-mode price IDs. Never copy production values:
SUPABASE_URL, SUPABASE_PUBLISHABLE_KEYS or SUPABASE_ANON_KEY, STRIPE_SECRET_KEY (test mode only), STRIPE_PRICE_BASIC (test), STRIPE_PRICE_PRO (test).

## Remaining Edge Function source inspection
The connector returned no source files for stripe-webhook, tamos-cover-once, and reputix-ai in the follow-up inspection call; their existence/version/verify_jwt remains confirmed by the function inventory. Do not infer their contracts until source is successfully retrieved.

## Production safety
No production function deployment or configuration change. Continue to preserve live Stripe mode, prices, payout details, webhook destination, and production secrets.
