# Reputix AI Agent Team

Status: foundation deployed to Reputix-Staging only (2026-11-17).
Production project is intentionally untouched.

## Operating model
- Commander coordinates tasks and reports; it cannot approve its own work.
- Specialist agents: engineer, architect, auditor, moderator, analyst, growth, business_ops, innovation.
- Tasks move through queued -> claimed -> running -> completed/failed/blocked.
- Any production deployment, billing/domain/auth change, external message, business moderation decision, or destructive operation requires a human approval record.
- Agent records are seeded disabled. Enable only after the dispatcher, authentication, spend limits, and end-to-end tests are ready.

## Data plane
The staging database contains six isolated tables:
- reputix_ai_agents
- reputix_ai_tasks
- reputix_ai_task_logs
- reputix_ai_knowledge
- reputix_ai_approvals
- reputix_ai_reports

All six have RLS enabled. Browser roles (anon/authenticated/public) have no table privileges. The service role is the only runtime role granted access. Do not expose these tables to the public client.

## Execution plane (next implementation step)
1. Admin-authenticated task intake endpoint.
2. Dispatcher with strict agent allowlist and per-task token/cost ceilings.
3. Worker using OpenAI Responses API with store=false and untrusted-input boundaries.
4. Separate reviewer/auditor pass for code or policy changes.
5. Approval gate before any sensitive action.
6. Scheduled runner only after queue concurrency, retry, timeout, and idempotency tests.

## Non-negotiable safeguards
- Work in staging and feature branches first; never write directly to main.
- No automatic production deployment.
- Never delete or rewrite users, accounts, businesses, photos, reviews, or payment records.
- Never modify the custom domain/DNS, Stripe live configuration, payout settings, webhooks, or sensitive Auth settings without explicit approval.
- Never place OpenAI or Supabase service-role secrets in browser code, Git, logs, prompts, or reports.
- Moderation is advisory; humans retain publication/rejection decisions.
- Keep original review text and original language intact.

## Current implementation state
- Staging project: lzcyulncvjjxsyyivlty (ACTIVE_HEALTHY, us-east-2).
- Production project: udvsrmfgjfinwbgvhchs (read-only inspection only; no changes made).
- Existing staging Edge Function reputix-ai remains untouched.
- Nine agent definitions are seeded with enabled=false.
- Runtime dispatcher, OpenAI execution, admin UI, scheduled jobs, and end-to-end tests are not yet deployed.
