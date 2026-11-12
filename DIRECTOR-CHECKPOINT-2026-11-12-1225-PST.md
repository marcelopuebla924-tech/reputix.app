# Reputix Director checkpoint — 2026-11-12 12:25 p.m. PST

## Work plan: five ordered objectives

### Objective 1 — Reputix AI security regression coverage
- Added `tests/reputix-ai-source-contract.test.mjs` with nine Node source-contract tests for:
  1. Explicit CORS allowlist and no wildcard.
  2. Request origin is reflected only when allowlisted.
  3. OPTIONS preflight is handled before method/auth guards.
  4. Non-POST requests are rejected.
  5. Supabase user token is validated server-side.
  6. Admin moderation queue requires `app_metadata.reputix_role=admin`.
  7. User moderation only accesses own pending review.
  8. Moderation remains advisory-only and does not patch review status.
  9. Assistant Pro entitlement is checked server-side.
- Added `.github/workflows/reputix-ai-contract-tests.yml` to run Deno type-check and the Node tests on relevant pushes/PRs and manual dispatch.
- Commits:
  - Test suite: `51ad3a131e674f5879c3f14a2a42de3915de71e0`
  - Workflow: `31836fdd9def0176ec14e9aab88b90d3418bb4e5`
- The files were read back from GitHub and their content verified.
- IMPORTANT: The new workflow's run result has not yet been independently retrieved. Do not claim the new tests passed until a completed successful GitHub Actions run is confirmed.
- No Edge Function deployment or production change occurred.

### Objective 2 — owner complaint permissions
- PR #34 exact current head: `4bb2f75006f1d301cb9e23daa3ded7195f2e9160`.
- Its two current GitHub workflows completed successfully: Owner complaint RPC security candidate tests and Reputix Browser QA.
- Staging catalog re-verified:
  - SECURITY DEFINER function with empty `search_path`.
  - Requires `auth.uid()`, response length 3–3000, verified owner claim, and approved business.
  - ACL: anon=false, authenticated=true, service_role=true.
- A true hosted staging invocation using synthetic Auth identities is still not completed. Earlier synthetic row insertion was blocked by the required FK to `auth.users`; no constraints were weakened and no test records committed.
- Do not merge PR #34 or promote the function to production until hosted integration tests safely validate Owner A, Owner B, unverified owner, and unapproved business.

### Objective 3 — production/staging drift comparison
- Both projects' security advisors currently report four RLS-enabled service-only tables without policies: `business_monthly_history`, `business_verification_documents`, `payment_events`, `review_ai_moderation`. These are intentional backend-only designs; do not add client policies.
- Both report public proposal RPC as SECURITY DEFINER callable by anon/authenticated; this is the public pending-business proposal flow and requires abuse/rate-limit review, not blind revocation.
- Both report authenticated execution of owner complaint SECURITY DEFINER RPC; intended owner workflow, with staging function now hardened.
- Production function definition still lacks the approved-business predicate, while staging contains it. This is a confirmed code/database drift.
- Production advisor additionally reports leaked-password protection disabled; staging's current advisor output did not report that finding. Do not change Auth settings without explicit approval.
- Production AI Edge Function v22 has `verify_jwt=true` but still uses wildcard CORS. GitHub main uses explicit allowlist. No deployment performed.

### Objective 4 — corrections
- The staging-only complaint RPC hardening was applied in the prior checkpoint and verified again here.
- No production DB function, Auth setting, Stripe configuration, DNS/domain, or user data changed.
- Do not deploy the AI function until new contract workflow passes and runtime behavior is reviewed.
- Do not merge Stripe PR #33; it remains draft/unmerged pending hosted Supabase integration and Stripe-side inventory reconciliation.

### Objective 5 — final QA
- PR #34 Browser QA workflow on its current head completed successfully.
- The existing browser suite is UI/browser QA and uses mocks for some backend flows; it does not prove hosted Auth, RLS, live AI, Stripe, email delivery, or payment behavior.
- Full launch QA remains open until AI workflow run is green, owner hosted permission tests are completed, and backend environment drift is resolved.

## Safety
- No user accounts, reviews, businesses, photos, or production data were deleted or altered.
- No production/staging Auth configuration, Stripe live settings, webhook destination, payouts, prices, domain, or DNS changed.
- This checkpoint deliberately records unverified gates rather than overstating completion.
