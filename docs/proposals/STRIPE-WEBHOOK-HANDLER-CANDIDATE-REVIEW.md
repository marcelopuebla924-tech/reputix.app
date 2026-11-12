# Stripe webhook Edge Function candidate — contract review

Status: isolated candidate only. The production stripe-webhook v3 function has not been changed, invoked, or redeployed.

## Candidate files
- supabase/functions/stripe-webhook/index.ts: Deno/Supabase Edge Function adapter using Stripe SDK and environment-only credentials.
- supabase/functions/stripe-webhook/core.mjs: dependency-injected request handler, separable from Deno for Node contract tests.
- tests/stripe-webhook-handler.test.mjs: Node built-in tests with synthetic events and fake Stripe/Supabase transport.
- .github/workflows/stripe-webhook-handler-tests.yml: runs contract tests and Deno type-check on relevant pull-request changes.

## Security and event processing contract
- Reject non-POST requests and missing signatures.
- Read raw body exactly once; pass untouched bytes/text to Stripe constructEventAsync before parsing or database work.
- Require explicit STRIPE_EXPECT_LIVEMODE='true' or 'false'; reject event.livemode mismatch. This variable is not currently confirmed/configured in any project. Do not deploy until configured intentionally for the target environment.
- Require STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY from server environment only. Never log values.
- Retrieve the current Stripe subscription for supported subscription/checkout/invoice events. Do not synthesize past_due on invoice.payment_failed; pass through Stripe's retrieved status.
- Use verified event.created as the ordering timestamp, not delivery time or local updated_at.
- Require trusted subscription metadata user_id (UUID) and plan (basic/pro). Checkout completion may fall back to Checkout Session metadata; subscription metadata takes precedence. Missing metadata records the signed event as ignored rather than granting entitlements.
- Make exactly one Supabase write: POST to public.process_stripe_webhook_event RPC. Do not separately write payment_events or user_subscriptions.
- Acknowledge duplicate/processed/ignored RPC results with 2xx. Return 5xx for RPC/network/Stripe retrieval failures so Stripe can retry. Invalid signatures or mode mismatch return 400.
- The candidate requires verify_jwt=false at the Edge Function gateway because Stripe's signature verification is the authentication mechanism. This setting has not been deployed or changed.

## Isolated contract test coverage
- method guard; missing and invalid signatures; exact raw-body preservation; explicit mode configuration and mismatch rejection; Stripe incomplete_expired status passthrough;
- event.created timestamp conversion; metadata trust/fallback; unknown/missing-metadata events recorded as ignored;
- invoice.payment_failed preserves retrieved active status;
- only the atomic RPC endpoint is called; duplicate/processed/ignored results acknowledged; RPC failure returns 500.

## Remaining release gates
- GitHub Actions handler contract workflow run #5 passed: Deno type-check succeeded and Node contract suite passed 15/15 tests. These use synthetic events and fake transports only; they do not invoke Supabase RPC or a real Stripe endpoint.
- Add a Deno typecheck/build step using the pinned Stripe SDK version and confirm import compatibility.
- Validate RPC parameter/result behavior against an isolated Supabase schema (not production); test real Stripe test-mode signed events only after explicit test-environment approval.
- Confirm the intended STRIPE_EXPECT_LIVEMODE value and test/live key pairing in a separately approved environment. Do not read or modify production secrets as part of this candidate work.
- Integrate only after the candidate SQL migration, Stripe-side subscription inventory, legacy reconciliation, staging advisors/schema diff, and invoice failure policy are reviewed.
- No production or staging function deployment, invocation, secret read, webhook delivery, checkout, or payment was performed.