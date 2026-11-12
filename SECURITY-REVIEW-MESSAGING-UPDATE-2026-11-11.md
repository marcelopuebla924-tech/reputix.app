# Reputix — Messaging UPDATE security review (draft only)

Date: 2026-11-11
Project: Supabase production project `udvsrmfgjfinwbgvhchs`
Status: **Finding confirmed by read-only inspection; remediation NOT applied.**

## Evidence collected (read-only)

1. `business_messages` RLS UPDATE policy:
   - `USING`: row sender differs from `auth.uid()` and the caller participates in the conversation.
   - `WITH CHECK`: only verifies `sender_id <> auth.uid()`.
2. `information_schema.column_privileges` reports `authenticated` has UPDATE privileges on all columns of `business_messages`, including `body`, `conversation_id`, `sender_id`, and `read_at`.
3. No triggers were returned by `information_schema.triggers` for `business_messages` or `business_conversations`.
4. Current frontend owner inbox PATCH updates only `read_at` for unread messages not sent by the owner.
5. The current mocked Playwright messaging tests validate the UI flow, not live RLS enforcement.

## Risk

A conversation participant may be able to update a received message's body or other columns, because the database grants broad UPDATE and the row policy does not constrain changed columns. This exceeds the UI's intended purpose of marking a received message as read. Treat as a production security blocker until tested and remediated.

## Proposed least-privilege direction (NOT EXECUTED)

After confirming the complete effective grants and reviewing rollback:
- Remove table-level UPDATE from `authenticated` on `public.business_messages`.
- Grant UPDATE only on `read_at` to `authenticated`.
- Keep the existing participant/received-message row predicate, and ensure the policy continues to prevent users from marking their own sent messages as read.
- Test with two synthetic users: customer and verified owner. Verify each can mark only messages received by them as read; neither can edit `body`, `sender_id`, or `conversation_id`; non-participants cannot read or update; unverified owners cannot access the inbox.
- Verify both positive and negative cases against a truly isolated backend before production rollout.

Illustrative SQL only — do not run until reviewed and explicitly authorized:

```sql
REVOKE UPDATE ON TABLE public.business_messages FROM authenticated;
GRANT UPDATE (read_at) ON TABLE public.business_messages TO authenticated;

-- Keep/review the existing RLS UPDATE policy:
-- USING: sender_id <> (select auth.uid()) AND caller is a conversation participant
-- WITH CHECK: sender_id <> (select auth.uid())
```

Important: column-level grants do not narrow an existing table-level UPDATE grant; the table-level privilege must first be revoked. Re-check effective privileges after the change. Review whether `anon` grants should also be removed as a separate, explicitly scoped hardening item; the absence of an anon RLS policy means grants alone do not prove anon can access rows.

## Guardrails

- This document is a proposal, not a migration and not an authorization to change Supabase.
- No SQL writes, grants, policies, schema, data, or settings were changed during the review.
- Do not apply this proposal without explicit owner approval and an isolated test environment.
