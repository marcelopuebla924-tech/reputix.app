-- Canonical worker RPCs for private schema reputix_ai. Service-role only.
create or replace function public.reputix_ai_claim_next_task() returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_task reputix_ai.tasks%rowtype; v_agent reputix_ai.agents%rowtype; v_run_id uuid; v_run_number integer;
begin
 select t.* into v_task from reputix_ai.tasks t join reputix_ai.agents a on a.agent_key=t.assigned_agent
 where t.status='queued' and t.requires_approval=false and t.input_payload->>'mode'='read_only_analysis'
 and a.enabled=true and a.autonomy_level='controlled'
 order by case t.priority when 'critical' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,t.created_at
 for update of t skip locked limit 1;
 if not found then return null; end if;
 update reputix_ai.tasks set status='running',started_at=now(),updated_at=now() where id=v_task.id returning * into v_task;
 select * into v_agent from reputix_ai.agents where agent_key=v_task.assigned_agent;
 select coalesce(max(run_number),0)+1 into v_run_number from reputix_ai.task_runs where task_id=v_task.id;
 insert into reputix_ai.task_runs(task_id,agent_key,run_number,status,model,prompt_version,started_at)
 values(v_task.id,v_agent.agent_key,v_run_number,'started','gpt-4.1-mini','controlled-readonly-v1',now()) returning id into v_run_id;
 return jsonb_build_object('task',to_jsonb(v_task),'agent',jsonb_build_object('agent_key',v_agent.agent_key,
 'display_name',v_agent.display_name,'specialty',v_agent.specialty,'description',v_agent.description,
 'capabilities',v_agent.capabilities,'forbidden_actions',v_agent.forbidden_actions,'autonomy_level',v_agent.autonomy_level),
 'run_id',v_run_id,'run_number',v_run_number);
end; $$;
create or replace function public.reputix_ai_complete_task(p_run_id uuid,p_output_summary text,p_model text default 'gpt-4.1-mini')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_task_id uuid;
begin
 if p_output_summary is null or length(btrim(p_output_summary))<1 or length(p_output_summary)>20000 then raise exception 'Invalid task output summary'; end if;
 update reputix_ai.task_runs set status='succeeded',model=coalesce(p_model,model),output_summary=p_output_summary,finished_at=now()
 where id=p_run_id returning task_id into v_task_id;
 if v_task_id is null then raise exception 'Task run not found'; end if;
 update reputix_ai.tasks set status='completed',result_summary=p_output_summary,completed_at=now(),updated_at=now() where id=v_task_id;
 return jsonb_build_object('task_id',v_task_id,'status','completed');
end; $$;
create or replace function public.reputix_ai_fail_task(p_run_id uuid,p_error_summary text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_task_id uuid;
begin
 update reputix_ai.task_runs set status='failed',error_code='worker_error',error_summary=left(coalesce(p_error_summary,'Worker failed'),1000),finished_at=now()
 where id=p_run_id returning task_id into v_task_id;
 if v_task_id is null then raise exception 'Task run not found'; end if;
 update reputix_ai.tasks set status='failed',result_summary=left(coalesce(p_error_summary,'Worker failed'),1000),completed_at=now(),updated_at=now() where id=v_task_id;
 return jsonb_build_object('task_id',v_task_id,'status','failed');
end; $$;
revoke all on function public.reputix_ai_claim_next_task() from public,anon,authenticated;
revoke all on function public.reputix_ai_complete_task(uuid,text,text) from public,anon,authenticated;
revoke all on function public.reputix_ai_fail_task(uuid,text) from public,anon,authenticated;
grant execute on function public.reputix_ai_claim_next_task() to service_role;
grant execute on function public.reputix_ai_complete_task(uuid,text,text) to service_role;
grant execute on function public.reputix_ai_fail_task(uuid,text) to service_role;
update reputix_ai.agents set enabled=false,updated_at=now() where enabled=true;
update reputix_ai.tasks set input_payload=coalesce(input_payload,'{}'::jsonb)||jsonb_build_object('mode','read_only_analysis','environment','Reputix-Staging','constraints',jsonb_build_array('no production changes','no data deletion','no Stripe/domain/auth changes','report evidence and recommendations')),updated_at=now()
where id='6560b7d3-f982-4cee-8101-2ee167bc3375' and status='queued';