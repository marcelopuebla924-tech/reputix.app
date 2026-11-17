# Reputix AI — Agent Team Foundation

Status: staging foundation installed. Production is unchanged. Work is isolated on branch ai/agent-foundation-staging.

## Operating model
Controlled autonomy. Agents may inspect, research, draft changes, create isolated development work, and run tests. They must request human approval before production deployment, production data/schema changes, authentication/security changes, Stripe or billing changes, domain/DNS changes, external messages, or irreversible actions. Deletion of users, businesses, reviews, photos, or other customer data is prohibited.

## Agent roster
- Commander — coordination, triage, delegation, approval routing, reporting.
- Engineer — code review, bug reproduction, patch proposals, automated tests.
- Architect — schema/query/RLS/performance review.
- Auditor — permission, dependency, secret-exposure and incident review.
- Moderator — language detection, spam/abuse signals, moderation recommendations; no unilateral publication/rejection.
- Analyst — aggregate analytics and trends; no exposure of personal data.
- Growth — campaign plans, content drafts and growth experiments; no unapproved spend or outbound messages.
- Business operations — onboarding, claims and verification workflow analysis; no automatic claim approvals.
- Innovation — product/technical research and feature proposals.

## Existing staging runtime discovered
Reputix-Staging project: lzcyulncvjjxsyyivlty.
The staging project already contained a first-generation AI runtime: Edge Function reputix-ai and public tables reputix_ai_agents, reputix_ai_tasks, reputix_ai_task_logs, reputix_ai_approvals, reputix_ai_knowledge, and reputix_ai_reports. The nine existing agent records are disabled. The existing Edge Function supports conversational assistant, translation, advisory review moderation and an admin moderation list; it does not yet dispatch the nine-agent task queue.
To avoid replacing or breaking this existing implementation, it was left untouched. Nine read-only analysis tasks were queued in the existing public.reputix_ai_tasks table, one per workstream. They remain queued and have not been executed because the worker/dispatcher is not yet implemented and agents remain disabled.

## Isolated private control-plane pilot
A separate private schema named reputix_ai was created additively in Reputix-Staging only, with tables agents, tasks, task_runs, approvals, knowledge and reports. It contains nine role definitions. All six tables have RLS enabled. The schema is not exposed through the public Data API; privileges are revoked from PUBLIC, anon and authenticated, and usage/table access is granted only to service_role for trusted server-side use.
This private pilot is not yet wired to the existing runtime. Do not build a second dispatcher against it until the existing public queue and this pilot are reconciled into one canonical design. The private pilot contains no task/run/approval/knowledge/report records.

## Verified safeguards
- Confirmed anon and authenticated have no schema USAGE on the private reputix_ai schema.
- Confirmed service_role has schema USAGE.
- Confirmed nine agent definitions in the private pilot and nine pre-existing disabled agents in the legacy staging registry.
- No production project, main branch, GitHub Pages deployment, domain, Stripe settings, auth configuration or customer data was changed.

## Execution lifecycle target
1. Commander creates a task with area, priority, inputs and responsible agent.
2. A trusted worker records a run and returns a structured result.
3. Approval-gated actions enter blocked_approval and create an approval record.
4. A human decision is recorded before any gated action.
5. A separate trusted worker performs only the exact approved action.
6. Auditor verifies the result; Commander closes the task and writes a report.

## Next implementation milestones
1. Reconcile the existing public AI schema with the isolated private pilot; select one canonical task queue and registry without deleting or losing records.
2. Review existing auth/admin metadata and RLS policies; fix security findings only after their intended access model is understood.
3. Implement authenticated server-side task intake, dispatch, worker execution and approval functions. Never expose service-role or OpenAI secrets in browser code.
4. Add model allowlists, token/cost budgets, timeouts, retries and idempotency.
5. Build an admin-only control panel and scheduled reports after integration tests pass in staging.
6. Run integration, RLS and failure-path tests in staging before any production rollout.

## Known staging audit findings to investigate
- Supabase Security Advisor reports 16 RLS-enabled tables without policies, including the six private pilot tables and several pre-existing public tables. For the private schema, this is intentional defense-in-depth because anon/authenticated have no schema access; do not add broad policies just to silence the advisor.
- Advisor also reports pre-existing SECURITY DEFINER functions executable by anon/authenticated. Review submit_business_proposal and owner_respond_to_complaint against their intended public workflows before changing grants or function security.
- Performance Advisor reports unindexed foreign keys on several existing and new tables. Add indexes only after query patterns and schema reconciliation are finalized.

## Explicit non-goals
- No production database migration.
- No edits to main or GitHub Pages deployment.
- No changes to domain/DNS, Stripe, prices, payout settings, webhook destinations, authentication settings, existing user data, businesses, reviews or photos.
- Agents are not yet running autonomously. This staging setup establishes the registry, task backlog, security boundary and implementation plan only.