# Reputix AI — staging CORS hardening and deployment
**Date/time:** 11 November 2026, 9:16 p.m. PST (America/Los_Angeles)

## Change
- Updated `supabase/functions/reputix-ai/index.ts`.
- Replaced wildcard `Access-Control-Allow-Origin: *` with an explicit origin allowlist:
  - `https://reputixapp.com`
  - `https://www.reputixapp.com`
  - `https://marcelopuebla924-tech.github.io`
- Added `Vary: Origin`.
- Request-specific CORS headers now flow through the JSON response helper and OPTIONS preflight handler.
- Existing request authentication remains in place; Supabase deployment also has `verify_jwt=true`.

## GitHub
- Commit: `11133fc2d58afa633495394235c62a02229ee2a9`
- Source file: [supabase/functions/reputix-ai/index.ts](https://github.com/marcelopuebla924-tech/reputix.app/blob/main/supabase/functions/reputix-ai/index.ts)

## Staging deployment
- Project: `lzcyulncvjjxsyyivlty` (Reputix-Staging)
- Function: `reputix-ai`
- Status: ACTIVE
- Version: 1
- `verify_jwt`: true
- Function ID: `533e3123-9a1f-438e-aa9d-f287ea27b8ef`
- Deployed source checksum: `206131235a8f9f308444857c9896565cbb48345a7c31c474e90a50a6f3da3c50`
- Re-read via Supabase function retrieval and confirmed the deployed source contains the approved-origin list.

## Validation limits
- The deployment/bundling succeeded and Supabase reports ACTIVE.
- No authenticated runtime request was made: synthetic staging Auth users are not yet available.
- AI translation/moderation/chat still require a staging-only `OPENAI_API_KEY`; no secret was read, created, or changed.
- No staging Edge Function logs were present immediately after deployment.
- GitHub Browser QA and Pages deployment for commit `11133fc` were still running at the time of this checkpoint; do not claim those new runs passed until their final status is checked.

## Production boundary
- No production Edge Function was deployed or changed.
- No production secrets, Stripe configuration, Auth configuration, domain, DNS, or database settings were modified.
