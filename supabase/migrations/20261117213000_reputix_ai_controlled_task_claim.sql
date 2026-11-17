-- Atomic, service-role-only claim for the existing Reputix AI queue.
-- Claims only enabled agents and tasks explicitly marked read_only_analysis.
create or replace function public.reputix_ai_claim_next_task()
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_task public.reputix_ai_tasks%rowtype; v_agent public.reputix_ai_agents%rowtype;
begin
  select t.* into v_task from public.reputix_ai_tasks t
  join public.reputix_ai_agents a on a.agent_key=t.agent_key
  where t.status='queued' and t.requires_approval=false and t.approval_status='none'
    and t.attempts<t.max_attempts and t.input->>'mode'='read_only_analysis' and a.enabled=true
  order by t.priority asc,t.created_at asc for update of t skip locked limit 1;
  if not found then return null; end if;
  update public.reputix_ai_tasks set status='claimed',attempts=attempts+1,updated_at=now()
  where id=v_task.id returning * into v_task;
  select * into v_agent from public.reputix_ai_agents where agent_key=v_task.agent_key;
  insert into public.reputix_ai_task_logs(task_id,agent_key,event_type,message,metadata)
  values(v_task.id,v_task.agent_key,'claimed','Tarea reclamada por ejecutor controlado.',
    jsonb_build_object('environment','staging','mode','read_only_analysis'));
  return jsonb_build_object('task',to_jsonb(v_task),'agent',jsonb_build_object(
    'agent_key',v_agent.agent_key,'display_name',v_agent.display_name,
    'specialty',v_agent.specialty,'system_instructions',v_agent.system_instructions));
end; $$;
revoke all on function public.reputix_ai_claim_next_task() from public,anon,authenticated;
grant execute on function public.reputix_ai_claim_next_task() to service_role;