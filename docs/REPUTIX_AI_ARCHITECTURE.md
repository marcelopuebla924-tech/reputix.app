# Reputix AI — Agent Team Foundation

Status: foundation installed on **Reputix-Staging only**. Production is unchanged.

## Operating model
Controlled autonomy. Agents may inspect, research, draft changes, create isolated development work, and run tests. They must request human approval before production deployment, production data/schema changes, authentication/security changes, Stripe or billing changes, domain/DNS changes, external messages, or irreversible actions. Deletion of users, businesses, reviews, photos, or other customer data is prohibited.

## Agent roster
- reputix_commander — coordination, triage, delegation, approval routing, reporting.
- engineering — code review, bug reproduction, patch proposals, automated tests.
- database_architect — schema/query/RLS/performance review.
- security_auditor — permission, dependency, secret-exposure and incident review.
- review_moderator — language detection, spam/abuse signals, moderation recommendations; no unilateral publication/rejection.
- business_analyst — aggregate analytics and trends; no exposure of personal data.
- growth_marketer — campaign plans, content drafts and growth experiments; no unapproved spend or outbound messages.
- business_ops — onboarding, claims and verification workflow analysis; no automatic claim approvals.
- innovation — product/technical research and feature proposals.

## Staging installation
Supabase project: Reputix-Staging (lzcyulncvjjxsyyivlty).
Private schema: reputix_ai.
Tables: agents, tasks, task_runs, approvals, knowledge, reports.
All six tables have RLS enabled. The schema is not exposed through the public Data API; schema/table privileges are revoked from PUBLIC, anon, and authenticated, with service-role access reserved for trusted server-side execution. Never place service-role or OpenAI secret keys in browser code.
The agent registry contains nine seeded roles. Task, run, approval, knowledge and report tables are empty by design.

## Execution lifecycle
1. Commander creates a task with area, priority, inputs and responsible agent.
2. Worker records a run and returns a structured result.
3. If an action is approval-gated, create an approval record and set task status to blocked_approval.
4. A human decision is recorded in approvals.
5. After approval, a separate trusted worker may perform the exact approved action.
6. Auditor verifies the result; Commander closes the task and writes a report.

## Next implementation milestones
1. Add authenticated server-side Edge Functions for task intake, dispatch, worker execution and approval decisions.
2. Store OpenAI credentials only as server-side secrets; implement model allowlists, token/cost limits, timeouts, retries and idempotency.
3. Add an admin-only control panel after reviewing current auth/admin authorization patterns.
4. Add scheduled health/audit/report jobs only after verifying available extensions and schedules in staging.
5. Run integration, RLS and failure-path tests in staging before any production rollout.

## Explicit non-goals for this foundation
- No production database migration.
- No edits to main or GitHub Pages deployment.
- No changes to domain/DNS, Stripe, prices, payout settings, webhook destinations, authentication settings, existing user data, businesses, reviews or photos.
- No claim that agents are already running: this commit establishes the staging data foundation and operating contract only.