# Reputix Messaging Least-Privilege Proposal — 2026-11-11

Status: **PROPOSED ONLY — NOT APPLIED TO SUPABASE**

## Evidence collected (read-only)

Project: `udvsrmfgjfinwbgvhchs`

Tables:
- `public.business_conversations`
- `public.business_messages`

Both tables have RLS enabled. No triggers were found on either table. Current table ACL for `business_messages` grants table-level ALL to `anon` and `authenticated`. The authenticated UPDATE policy limits rows to a participant's received messages, but its `WITH CHECK` only ensures `sender_id <> auth.uid()`. The browser app currently sends a PATCH containing only `read_at` when marking an incoming message as read.

Current frontend payloads inspected:
- Conversation creation: `business_id, customer_id, subject, status`
- Message creation: `conversation_id, sender_id, body`
- Message read receipt: `read_at` only

No UPDATE or DELETE request for `business_conversations` or DELETE request for `business_messages` was found in the inspected app code.

## Proposed SQL — requires explicit approval before execution

This is a least-privilege grant proposal based on the current frontend payloads and RLS policies. It removes broad table grants from the two messaging tables, removes anonymous access, and grants only the operations currently used by the client.

```sql
begin;

-- Anonymous visitors do not participate in private conversations.
revoke all privileges on table public.business_conversations from anon;
revoke all privileges on table public.business_messages from anon;

-- Conversations: signed-in users can read permitted rows and create conversations.
revoke all privileges on table public.business_conversations from authenticated;
grant select on table public.business_conversations to authenticated;
grant insert (business_id, customer_id, subject, status)
  on table public.business_conversations to authenticated;

-- Messages: signed-in participants can read, send, and mark incoming messages read.
revoke all privileges on table public.business_messages from authenticated;
grant select on table public.business_messages to authenticated;
grant insert (conversation_id, sender_id, body)
  on table public.business_messages to authenticated;
grant update (read_at)
  on table public.business_messages to authenticated;

commit;
```

## Important compatibility notes

- The current app uses explicit SELECT column lists for both tables; it does not use `select=*` in the inspected messaging flows.
- The app's conversation insert includes `status: "open"`, so the proposed INSERT grant includes `status`.
- The app's message insert includes only `conversation_id`, `sender_id`, and `body`.
- The current UPDATE policy is retained; column privilege limits the updateable field to `read_at`, while RLS still restricts which rows can be updated.
- Before execution, run a final code search for all references to these tables and confirm there are no hidden workflows that require additional columns or operations.
- After execution, test with synthetic authenticated customer and verified-owner accounts: create conversation, send/reply, list only participant conversations, mark only received messages read, and verify UPDATE of `body`, `sender_id`, or `conversation_id` is rejected.
- Also verify anonymous SELECT/INSERT/UPDATE are denied and the normal homepage remains unaffected.

## Safety

- No SQL was executed that changes schema, grants, policies, or data.
- No messages, conversations, accounts, or business records were created or modified.
- This proposal must not be applied until the user explicitly approves the Supabase permission change.
