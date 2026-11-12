# Checkout Session Review — 11 Nov 2026

Read-only review of production Edge Function `create-checkout-session` v8. No checkout session was created, no Stripe API call was made, and no secret values or live settings were accessed or changed.

## Confirmed implementation
- ACTIVE, `verify_jwt=true`.
- Allows POST and OPTIONS; rejects other methods.
- Validates Bearer session independently through Supabase Auth `/auth/v1/user`.
- Accepts only `basic` or `pro`; selects the corresponding server-side Stripe Price ID.
- Requires server-side Stripe secret and configured price ID.
- Creates hosted subscription Checkout Session.
- Sets both Checkout Session `metadata` and `subscription_data.metadata` with `user_id` and `plan`.
- This confirms the metadata contract expected by `stripe-webhook` v3 is correctly populated for both Checkout completion and subsequent subscription events.
- Uses `client_reference_id=user.id`.
- CORS allowlist includes apex domain, www domain, and GitHub Pages origin.
- Does not enable automatic tax or promotion codes; payment method is collected.

## Risks / validation still required
1. **Canonical redirect:** success and cancel URLs currently use `https://reputixapp.com` (apex), while the primary app URL is also used as `https://www.reputixapp.com`. Test apex-to-www behavior and session continuity. Do not change domain/DNS or URLs without confirming the desired canonical host.
2. **Subscription scope:** Checkout creates user-level Basic/Pro subscriptions, and the webhook writes `user_subscriptions`. Confirm product copy and UI do not imply that this flow purchases a business subscription if `business_subscriptions` is a separate product.
3. **Existing subscription handling:** source does not visibly check for an existing active subscription or reuse an existing Stripe customer. Test repeat checkout, account cancellation, and duplicate subscriptions in isolated Stripe test mode.
4. **Abuse/cost control:** no explicit per-user checkout rate limit is visible. Add server-side throttling and duplicate-session controls before broad launch.
5. **Failure/retry UX:** test expired sessions, abandoned checkout, repeated success callbacks, and webhook delay without granting Pro based only on a browser redirect.

## Decision
- Checkout-to-webhook metadata is correctly connected.
- Production remains unchanged.
- Next work: inspect schema uniqueness/constraints and staging billing fixtures, then exercise full lifecycle only with isolated Stripe test credentials and disposable staging users.
