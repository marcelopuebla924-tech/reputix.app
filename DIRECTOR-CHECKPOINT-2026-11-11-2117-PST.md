# Reputix — Director Checkpoint
**Date/time:** 11 November 2026, 9:17 p.m. PST (America/Los_Angeles)

## Repository and environment
- GitHub repository: `marcelopuebla924-tech/reputix.app`, branch `main`.
- Supabase staging: `lzcyulncvjjxsyyivlty` (Reputix-Staging, ACTIVE_HEALTHY, us-east-2).
- Supabase production: `udvsrmfgjfinwbgvhchs`.
- Current latest main commit at checkpoint: `b5ee639d1e5dbbc4d2eda589145bb603fb25863f`.
- Latest code commit: `11133fc2d58afa633495394235c62a02229ee2a9`.
- Previous checkpoint: `DIRECTOR-CHECKPOINT-2026-11-11-2114-PST.md`.

## Work completed in this continuation
### Browser and deployment QA
- Confirmed previous documentation checkpoint commit `eca26ca41813fb765a41abb88324b770e0ae89f1` passed Reputix Browser QA and GitHub Pages build/deployment.
- Browser suite currently contains **34 named checks** in `tests/smoke.spec.cjs`.
- For code commit `11133fc2...`, Browser QA run `43160280390` was still in progress at 9:17 p.m.; Pages deployment run `43160336108` was still in progress.
- For documentation commit `b5ee639d...`, Browser QA run `43160335650` was still in progress.
- Do not claim the latest runs passed until checked. The Pages build job for the earlier run had completed successfully, but deployment was cancelled by a newer run; the newer Pages run is the authoritative one to verify.

### Reputix AI CORS hardening
- Reviewed `supabase/functions/reputix-ai/index.ts`.
- Replaced wildcard CORS with allowlist:
  - `https://reputixapp.com`
  - `https://www.reputixapp.com`
  - `https://marcelopuebla924-tech.github.io`
- Added `Vary: Origin`; request-specific CORS headers are used for JSON responses and OPTIONS.
- GitHub code commit: `11133fc2d58afa633495394235c62a02229ee2a9`.
- Deployment record: `REPUTIX-AI-STAGING-CORS-DEPLOYMENT-2026-11-11-2116-PST.md`.
- Deployed **only to staging** using Supabase Edge Function deploy.
- Staging `reputix-ai`: ACTIVE, version 1, `verify_jwt=true`, function ID `533e3123-9a1f-438e-aa9d-f287ea27b8ef`.
- Retrieved the deployed function source and verified it contains the approved-origin list.
- No production function deployment, secret read/change, or Stripe configuration change.
- Authenticated runtime tests remain pending: no synthetic staging Auth users are available; AI chat/translation/moderation require staging-only `OPENAI_API_KEY`. No function logs were present immediately after deployment.

### Staging integrity verification
Read-only SQL verification at approximately 9:17 p.m.:
- Storage buckets: 0
- Storage objects: 0
- QA-named businesses: 0
- QA-named reviews: 0
No synthetic records or objects remain.

### Code inventory
- Repository contains `supabase/functions/reputix-ai` and `supabase/functions/create-checkout-session` source directories.
- Staging previously had zero Edge Functions; now `reputix-ai` is deployed. `create-checkout-session` is not deployed to staging.
- The current browser workflow is a static local-server Playwright suite with mocked Supabase responses for many flows; it does not certify live Auth, live RLS, live messaging, AI provider, or Stripe payment integration.

## Current blockers and next actions
1. **Storage buckets:** staging has zero buckets. Supabase MCP documentation says Storage tools are disabled by default; the currently connected tool set exposes no bucket-create action. Create through the Dashboard:
   - [Staging Storage buckets](https://supabase.com/dashboard/project/lzcyulncvjjxsyyivlty/storage/buckets)
   - Create `business-photos`: private, 5 MiB max, MIME allowlist `image/jpeg,image/png,image/webp`.
   - Create `business-verification-private`: private, 5 MiB max, MIME allowlist `image/jpeg,image/png,application/pdf`.
   - Do not make either bucket public; no client-facing policies for verification documents. Do not write to Storage system tables.
2. After bucket creation, test proposal prefix, MIME and size rejection, approved-photo visibility, private verification document isolation, then delete synthetic objects.
3. Create two synthetic staging Auth users using supported Auth UI/API, then test cross-business owner isolation, messaging, and complaint-response authorization.
4. Set staging-only AI provider secret if AI runtime tests are desired. Never copy production secrets.
5. Deploy/test staging checkout only after test-mode Stripe secret and Basic/Pro test Price IDs are configured. Do not touch live Stripe.
6. Verify the latest Browser QA and Pages deployment runs listed above before marking the current main commit fully green.

## Production protection
No production database, RLS, grants, Auth settings, Storage buckets/policies/objects, Edge Functions, secrets, Stripe live mode/prices/payouts/webhook destination, domain, or DNS were changed in this continuation. Continue to preserve all production user data and uploaded media.
