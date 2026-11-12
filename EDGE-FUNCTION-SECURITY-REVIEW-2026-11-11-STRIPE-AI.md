# Edge Function Security Review — 11 Nov 2026

Scope: read-only source review of the currently deployed production Edge Functions. No function was invoked, changed, redeployed, or supplied with test/live events. No secrets or secret values were read.

## Confirmed versions
- `stripe-webhook`: v3, ACTIVE, `verify_jwt=false` (expected for Stripe-signed webhooks).
- `reputix-ai`: v22, ACTIVE, `verify_jwt=true`.
- `tamos-cover-once`: v10, ACTIVE, `verify_jwt=false`.

## Stripe webhook — findings
Positive controls:
- Requires POST.
- Requires Stripe-Signature and verifies the raw request body using Stripe's webhook signature verifier and `STRIPE_WEBHOOK_SECRET`.
- Uses server-side Stripe and Supabase credentials; values were not accessed or recorded.
- Handles subscription checkout completion, subscription create/update/delete, and invoice paid/payment_failed events.
- Upserts `user_subscriptions` by `provider_subscription_id`.
- Records event IDs in `payment_events`; database uniqueness plus `resolution=ignore-duplicates` avoids duplicate event-log rows.
- Returns 500 on processing errors so Stripe can retry.

Risks / tests required before calling billing production-ready:
1. **Event idempotency is not checked before side effects.** The handler processes the subscription update first and only then inserts the event row. Duplicate deliveries can repeat processing. Upserts reduce duplicate-row risk but do not protect against out-of-order events overwriting newer subscription state. Add a durable event-claim/processing strategy or compare Stripe event creation/version semantics before applying updates.
2. **Checkout metadata linkage must be verified.** The handler expects `user_id` and `plan` metadata on the Stripe Subscription (with Checkout Session metadata as fallback only during `checkout.session.completed`). Confirm the checkout creator sets both Session metadata and `subscription_data.metadata`; otherwise later subscription.updated/deleted and invoice events may be ignored.
3. **Invoice payment-failed handling locally overrides an active subscription to `past_due`**, but later invoice/subscription event ordering may overwrite it. Test failure, recovery, cancellation, and out-of-order delivery in Stripe test mode.
4. **Billing scope:** this function writes `user_subscriptions` (user Basic/Pro), not `business_subscriptions`. Confirm that this is the intended subscription product and that business billing is not accidentally presented as fulfilled by this webhook.
5. **Event audit status:** event insert is performed after business logic. Confirm failed events are retried and logged in an operationally useful way; current code does not persist a separate failed row before returning 500.

No live Stripe configuration or event was changed or triggered.

## Reputix AI v22 — findings
Positive controls:
- Function deployment has `verify_jwt=true` and independently validates the Bearer token through Supabase Auth.
- Rejects missing/invalid sessions, invalid JSON, unsupported modes, and messages longer than 2,000 characters.
- Admin moderation queue requires `app_metadata.reputix_role=admin`.
- User review moderation verifies ownership and pending status before calling the model.
- Moderation is explicitly advisory-only; it does not automatically publish or reject reviews.
- Prompt treats reviews and business content as untrusted data and instructs the model not to follow embedded instructions.
- Translation preserves original review content and returns a separate translation.
- AI assistant checks the server-side subscription and requires active/trialing Pro (except admin).
- Business context is restricted to approved businesses and published reviews; the prompt explicitly warns that three recent reviews are only a sample.
- OpenAI requests set `store:false`.

Risks / tests required:
1. No explicit per-user/IP rate limiting or usage quota is visible in this function. Add server-side throttling and cost controls before broad launch.
2. CORS allows `Access-Control-Allow-Origin: *`. Authentication is still checked, but production should use an explicit allowlist of Reputix origins and verify all required headers.
3. Review moderation uses a privileged server key to fetch the review and write the moderation audit. Ownership is checked in code; test forged IDs, cross-account requests, concurrent status changes, and duplicate moderation submissions.
4. The admin moderation-list query returns up to 100 records and depends on app_metadata role. Verify only trusted server-side admin workflows can set that claim; test role revocation and stale JWT behavior.
5. Pro subscription verification reads the latest `user_subscriptions` row. Test duplicate subscriptions, canceled/expired periods, past_due, and stale rows to ensure access cannot persist incorrectly.
6. Translation accepts only the `en` vs default Spanish branch. Validate UI/API expectations for unsupported target languages.
7. Add request timeouts and structured operational metrics where appropriate; do not log user review text, auth tokens, or secret values.

## tamos-cover-once v10
The deployed handler always returns HTTP 410 with “This one-time upload endpoint is closed.” It performs no upload. Keep closed unless a separately reviewed replacement flow is required.

## Decision
- No production changes made.
- Do not redeploy or edit Stripe/AI functions in production as part of this review.
- Next safe action: retrieve the complete checkout function source and verify metadata propagation; then inspect webhook table constraints and build isolated Stripe test-mode cases in staging after schema recovery.
- Staging remains empty and is not yet a complete schema mirror.
