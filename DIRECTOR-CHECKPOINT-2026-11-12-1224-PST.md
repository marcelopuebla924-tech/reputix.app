# Reputix Director checkpoint — 2026-11-12 12:24 p.m. PST

## Objective 2: Reputix AI production/source drift review

### Confirmed source drift
- GitHub main source: `supabase/functions/reputix-ai/index.ts`, blob SHA `54b4be6602120e021f4436cc64eb0b208e8c0cda`.
- Deployed production function: `reputix-ai`, ACTIVE version 22, `verify_jwt=true`.
- The deployed version 22 source is not identical to GitHub main.
- Deployed version 22 uses `Access-Control-Allow-Origin: *`.
- GitHub main instead uses an explicit origin allowlist:
  - `https://reputixapp.com`
  - `https://www.reputixapp.com`
  - `https://marcelopuebla924-tech.github.io`
  and returns `Vary: Origin`.
- GitHub main retains explicit server-side user validation through `/auth/v1/user`, administrator metadata checks for the moderation queue, owner-only pending-review checks for moderation, and advisory-only moderation output.
- Production deployment has NOT been performed. No secrets, function settings, Auth settings, or production data were changed.

### Release gates still open
- No dedicated automated CORS/preflight regression test file was found at the expected `supabase/functions/reputix-ai/index.test.ts` path.
- Need add and run tests for allowed origins, disallowed origins, OPTIONS preflight, non-POST rejection, invalid/missing JWT, admin-only queue, user-owned pending-review restriction, and advisory-only response.
- Need verify all runtime dependencies and deployed-vs-repository function behavior before deploying GitHub main.
- Keep `verify_jwt=true`; do not deploy until tests pass and the deployment package is confirmed complete.

## Next action
Build a focused test harness for the Reputix AI handler/CORS behavior without changing production. Then inspect Stripe PR #33's atomic event-ordering candidate and legacy NULL timestamp reconciliation. PR #34 remains unmerged; staging integration validation is still an open gate.
