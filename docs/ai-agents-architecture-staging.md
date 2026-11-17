# Reputix AI Agent Team — Staging Checkpoint

Last reviewed: 2026-11-17 (America/Los_Angeles).

## Environment boundaries
- Repository: marcelopuebla924-tech/reputix.app.
- Working branch: ai/agent-foundation-staging.
- Backend: Supabase Reputix-Staging (lzcyulncvjjxsyyivlty).
- Production remains untouched; no domain/DNS, Stripe, billing, auth, customer data, main branch or production deployment changes.

## Canonical system
The canonical control plane is the private schema reputix_ai: agents, tasks, task_runs, approvals, knowledge and reports. It contains nine controlled agent roles. All nine are disabled. anon and authenticated have no schema USAGE; service_role has schema USAGE.

One audit task remains queued and marked read_only_analysis: Auditar y consolidar la base de agentes de Reputix, assigned to security_auditor. No task has been claimed; task_runs remains empty and no paid model call has been made.

## Retired and legacy systems
- ai_ops is a retired prototype: its nine agent records have status retired and its original audit task is cancelled. Retain the records; do not drop the schema as routine cleanup.
- The public reputix_ai_* tables are legacy integration tables. Their nine agents remain disabled and their nine queued work items are not connected to the canonical worker.
- The existing reputix-ai conversational function is unchanged.
- The separate reputix-ai-agents endpoint still targets the legacy public tables. Its staging version 2 now blocks execution when human approval is pending and blocks runs beyond max_attempts. Its agents remain disabled.

## Staging worker
reputix-ai-worker is deployed in Reputix-Staging at version 2 with JWT verification enabled. It requires a valid admin user with app_metadata.reputix_role=admin. It uses the private reputix_ai queue through service_role-only RPC wrappers and processes at most one read-only task per request. The worker has not yet been invoked with an admin session, and secret readiness has not been verified.

RPC safeguards: claim only queued read_only_analysis tasks assigned to enabled controlled agents with no approval requirement; completion and failure are written to task_runs and tasks. RPC execution is revoked from anon and authenticated and granted only to service_role.

All agents remain disabled pending an authenticated status check and a deliberately approved single-task staging test. No model call or external action has occurred.

## Next steps
1. Check worker status using a real admin session; do not run a task.
2. Confirm OPENAI_API_KEY and spending controls in staging without exposing the secret.
3. Enable only security_auditor for one read-only test after reviewing status and cost configuration.
4. Verify run history, result persistence, failure handling, and then disable the agent pending review.
5. Build the admin dashboard and broader orchestration only after these checks.

## Safety rules
Read/analyze/report is permitted. Prepare code changes on isolated branches and test in staging. Production deploys, production data changes, auth changes, Stripe/domain/DNS changes, external messages and spending require approval. Deleting data or manipulating legitimate reviews/ratings is prohibited.