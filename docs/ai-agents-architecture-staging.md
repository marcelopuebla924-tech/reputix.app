# Reputix AI Agent Team — Staging Foundation

Last reviewed: 2026-11-17 (America/Los_Angeles)

## Environment boundaries

- Repository: `marcelopuebla924-tech/reputix.app`
- Working branch: `ai/agent-foundation-staging`
- Backend for this foundation: Supabase project `Reputix-Staging` (`lzcyulncvjjxsyyivlty`)
- Production project `Reputix` is read-only for this work.
- Never change the production domain/DNS, Stripe settings, live secrets, auth settings, or production deployment without explicit approval.
- Never delete or overwrite user accounts, businesses, reviews, photos, payment records, or other customer data.

## Canonical agent registry found in staging

The existing private schema `reputix_ai` is the canonical agent foundation. It already contains:

- `agents`: 9 registered agents
- `tasks`: work queue
- `task_runs`: execution history and usage/cost tracking
- `approvals`: human approval gate
- `reports`: structured agent reports
- `knowledge`: shared project knowledge

Registered agents:

1. `reputix_commander` — orchestration, prioritization, reporting, approval routing
2. `engineering` — code review, bug reproduction, patch proposals, tests
3. `database_architect` — schema, query, RLS, performance review
4. `security_auditor` — permissions, security and incident review
5. `review_moderator` — language and content classification; recommendations only
6. `business_analyst` — aggregate analytics and trend reports
7. `growth_marketer` — campaigns, drafts and growth experiments
8. `business_ops` — onboarding, claims and verification workflow analysis
9. `innovation` — product research and feature proposals

All agents are constrained to `autonomy_level = controlled`. Keep this restriction.

## Queue item opened

A high-priority task was added to `reputix_ai.tasks`:

- ID: `6560b7d3-f982-4cee-8101-2ee167bc3375`
- Title: `Auditar y consolidar la base de agentes de Reputix`
- Assigned to: `security_auditor`
- Status: `queued`
- Scope: compare the private `reputix_ai` schema, public legacy `reputix_ai_*` tables, the isolated `ai_ops` prototype, RLS/grants, Edge Functions and admin authorization.
- Deliverable: audit report and a safe consolidation plan.
- No production changes permitted.

## Duplicate schema note

During initial staging setup, an isolated `ai_ops` prototype was created before the pre-existing `reputix_ai` foundation was discovered. It is explicitly marked retired/cancelled and must not be used by the application. It was not created in production and no existing customer data was touched. Do not drop it as part of routine work; any cleanup requires a separately reviewed migration.

## Next implementation sequence

1. Finish the staging audit and choose one canonical task/agent API.
2. Verify private schema grants and public legacy table grants; keep all agent data inaccessible to `anon` and ordinary `authenticated` users.
3. Verify the admin identity contract. The current Reputix AI Edge Function checks `app_metadata.reputix_role === "admin"`; preserve server-side authorization and do not trust user-editable metadata.
4. Implement a separate staging-only Commander endpoint with JWT verification enabled, bounded request sizes, rate limits, task idempotency, audit logs, and strict agent allowlists.
5. Keep model execution disabled until the OpenAI secret and spending limit are deliberately configured. Do not make paid model calls during foundation setup.
6. Add read-only dashboard visibility first. Add write actions only behind explicit approvals.
7. Run staging tests and Supabase security/performance advisors. Do not merge to `main` or deploy production without Marcelo's approval.

## Required safety policy

- Read/analyze/report: allowed.
- Prepare code changes and test in isolated branches/staging: allowed.
- Production deploys, production data changes, auth changes, Stripe/domain/DNS changes, outbound messages, spending or paid ads: approval required.
- Deleting data or manipulating legitimate reviews/ratings: prohibited.
- Every task must have an owner, status, result, and traceable run/report.
