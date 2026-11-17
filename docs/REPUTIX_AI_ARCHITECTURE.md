# Reputix AI — Controlled Agent Architecture

Last reviewed: 2026-11-17 (America/Los_Angeles).

## Environment and safety
- Repository: marcelopuebla924-tech/reputix.app.
- Working branch: ai/agent-foundation-staging.
- Backend: Supabase Reputix-Staging (lzcyulncvjjxsyyivlty).
- Production remains untouched. No changes to main, GitHub Pages, domain/DNS, Stripe, prices, payouts, webhooks, auth settings, or customer records.
- No deletion of users, businesses, reviews, photos, payment records, or other customer data.
- Controlled autonomy only. Agents may inspect, research and prepare read-only reports. Any write action, external communication, spending, moderation decision, auth/billing/domain change, or production deployment requires separate human approval.

## Canonical agent control plane
The canonical agent registry and task queue are in the private Supabase schema reputix_ai. Its six tables are agents, tasks, task_runs, approvals, knowledge and reports. All have RLS enabled. anon and authenticated have no schema USAGE; service_role has schema USAGE. The nine registered agents are reputix_commander, engineering, database_architect, security_auditor, review_moderator, business_analyst, growth_marketer, business_ops and innovation. All nine are currently disabled pending authenticated staging tests.

One read-only audit task is queued in reputix_ai.tasks: Auditar y consolidar la base de agentes de Reputix (assigned to security_auditor). Its input is explicitly marked read_only_analysis and staging-only. No task has been claimed; task_runs remains empty.

## Legacy schemas and endpoints — retained, not canonical
- ai_ops is a retired prototype. Its nine agents have status retired and its original audit task is cancelled. Do not use it or drop it as routine cleanup.
- public.reputix_ai_agents, public.reputix_ai_tasks, public.reputix_ai_task_logs, public.reputix_ai_approvals, public.reputix_ai_knowledge and public.reputix_ai_reports are legacy integration tables. They remain intact; their nine agent records are disabled and their nine queued backlog items are not connected to the canonical worker.
- The separate Edge Function reputix-ai-agents operates on those legacy public tables. It remains a compatibility endpoint, not the canonical private queue. Its staging version 2 now enforces approval_status=approved when requires_approval=true and enforces max_attempts before any run. The nine legacy agents remain disabled.
- The existing reputix-ai conversational Edge Function remains unchanged; it serves assistant, translation, advisory moderation and admin moderation-list modes.

## Controlled worker deployed in staging
A separate Edge Function reputix-ai-worker is deployed in Reputix-Staging, version 2, with verify_jwt enabled. It validates the user session and requires app_metadata.reputix_role=admin. It accepts only status and run_one modes, handles at most one task per request, and uses the private reputix_ai queue through service-role-only RPC functions. Its prompt is strictly read-only and prohibits data changes, external actions, moderation decisions and spending.

Three public-schema RPC wrappers are service_role-only and use a fixed search_path: reputix_ai_claim_next_task atomically claims one queued task only when its assigned agent is enabled, autonomy_level is controlled, approval is not required, and input mode is read_only_analysis; reputix_ai_complete_task records a successful run; reputix_ai_fail_task records a failed run. anon and authenticated cannot execute these functions.

The worker has not been invoked with an administrator session. Secret presence is not yet verified through the authenticated status endpoint. All private agents remain disabled, so the worker cannot claim or execute the queued task. No OpenAI model call has been made by this worker.

## Security observations
- The Supabase Security Advisor reports RLS-enabled tables without policies. For private agent schemas this is deliberate defense-in-depth because anon/authenticated have no schema access; do not add broad policies to silence the lint.
- Existing SECURITY DEFINER warnings remain on submit_business_proposal and owner_respond_to_complaint. These pre-existing workflows must be reviewed separately before changing grants or behavior.
- Never expose service-role or OpenAI secrets in browser code.

## Next steps
1. Verify worker status using an authenticated Reputix admin session without running a task.
2. Confirm the staging OpenAI secret and spending limit; do not make paid calls until deliberately checked.
3. Run one manually enabled security-auditor read-only task in staging, verify task_runs and result persistence, then disable it pending review.
4. Build an admin-only task/report panel and add bounded dispatch, retries, idempotency and cost accounting.
5. Run RLS, integration and regression tests before any production rollout.

## Explicit non-goals
No production deployment, customer-data mutation, review/business approval automation, external messages, ad spend, Stripe/domain/DNS/auth changes, or autonomous write actions.