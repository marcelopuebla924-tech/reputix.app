-- Reputix AI agent foundation (staging-first).
create table if not exists public.reputix_ai_agents (
 id uuid primary key default gen_random_uuid(),
 agent_key text not null unique check (agent_key ~ '^[a-z][a-z0-9_]{1,48}$'),
 display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
 specialty text not null check (char_length(btrim(specialty)) between 2 and 240),
 system_instructions text not null check (char_length(btrim(system_instructions)) between 20 and 12000),
 enabled boolean not null default false,
 config jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.reputix_ai_tasks (
 id uuid primary key default gen_random_uuid(),
 agent_key text not null references public.reputix_ai_agents(agent_key),
 title text not null check (char_length(btrim(title)) between 3 and 180),
 objective text not null check (char_length(btrim(objective)) between 10 and 12000),
 status text not null default 'queued' check (status in ('queued','claimed','running','blocked','completed','failed','cancelled')),
 priority smallint not null default 3 check (priority between 1 and 5),
 input jsonb not null default '{}'::jsonb,
 result jsonb,
 requested_by uuid,
 requires_approval boolean not null default true,
 approval_status text not null default 'none' check (approval_status in ('none','pending','approved','rejected')),
 idempotency_key text unique,
 attempts integer not null default 0 check (attempts >= 0),
 max_attempts integer not null default 3 check (max_attempts between 1 and 10),
 created_at timestamptz not null default now(),
 started_at timestamptz,
 completed_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.reputix_ai_task_logs (
 id bigint generated always as identity primary key,
 task_id uuid not null references public.reputix_ai_tasks(id) on delete restrict,
 agent_key text not null references public.reputix_ai_agents(agent_key),
 event_type text not null check (event_type in ('created','claimed','started','progress','warning','approval_requested','approved','rejected','completed','failed')),
 message text not null check (char_length(message) between 1 and 4000),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.reputix_ai_knowledge (
 id uuid primary key default gen_random_uuid(),
 namespace text not null check (char_length(btrim(namespace)) between 2 and 80),
 knowledge_key text not null check (char_length(btrim(knowledge_key)) between 2 and 160),
 content jsonb not null,
 source_task_id uuid references public.reputix_ai_tasks(id) on delete set null,
 created_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(namespace, knowledge_key)
);
create table if not exists public.reputix_ai_approvals (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.reputix_ai_tasks(id) on delete restrict,
 action_type text not null check (action_type in ('code_change','database_change','production_deploy','business_moderation','external_message','billing_change','domain_change','other')),
 summary text not null check (char_length(btrim(summary)) between 5 and 500),
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
 requested_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid,
 decision_note text
);
create table if not exists public.reputix_ai_reports (
 id uuid primary key default gen_random_uuid(),
 agent_key text not null references public.reputix_ai_agents(agent_key),
 report_type text not null check (char_length(btrim(report_type)) between 2 and 80),
 title text not null check (char_length(btrim(title)) between 3 and 180),
 summary text not null check (char_length(btrim(summary)) between 3 and 4000),
 payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists reputix_ai_tasks_queue_idx on public.reputix_ai_tasks(status,priority,created_at) where status in ('queued','blocked');
create index if not exists reputix_ai_tasks_agent_idx on public.reputix_ai_tasks(agent_key,created_at desc);
create index if not exists reputix_ai_logs_task_idx on public.reputix_ai_task_logs(task_id,created_at);
create index if not exists reputix_ai_approvals_pending_idx on public.reputix_ai_approvals(status,requested_at) where status='pending';
create index if not exists reputix_ai_reports_recent_idx on public.reputix_ai_reports(agent_key,created_at desc);
alter table public.reputix_ai_agents enable row level security;
alter table public.reputix_ai_tasks enable row level security;
alter table public.reputix_ai_task_logs enable row level security;
alter table public.reputix_ai_knowledge enable row level security;
alter table public.reputix_ai_approvals enable row level security;
alter table public.reputix_ai_reports enable row level security;
revoke all on public.reputix_ai_agents,public.reputix_ai_tasks,public.reputix_ai_task_logs,public.reputix_ai_knowledge,public.reputix_ai_approvals,public.reputix_ai_reports from public,anon,authenticated;
grant all on public.reputix_ai_agents,public.reputix_ai_tasks,public.reputix_ai_task_logs,public.reputix_ai_knowledge,public.reputix_ai_approvals,public.reputix_ai_reports to service_role;
grant usage,select on sequence public.reputix_ai_task_logs_id_seq to service_role;
