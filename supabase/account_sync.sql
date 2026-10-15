-- Atomic compare-and-set; unchanged revisions cannot overwrite another device.
create or replace function public.save_focus_state(expected_updated_at timestamptz, next_state jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_row public.user_state;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if next_state->>'user_id' is distinct from auth.uid()::text then raise exception 'Workspace identity changed';end if;
 select * into current_row from public.user_state where user_id=auth.uid() for update;
 if not found then raise exception 'Workspace must be initialized first'; end if;
 if current_row.updated_at is distinct from expected_updated_at then
   return jsonb_build_object('conflict',true,'row',to_jsonb(current_row));
 end if;
 if jsonb_typeof(next_state->'tasks')<>'array' or jsonb_typeof(next_state->'settings')<>'object' then raise exception 'Invalid workspace'; end if;
 update public.user_state set city=coalesce(next_state->>'city',city),tasks=next_state->'tasks',
 archived_tasks=coalesce(next_state->'archived_tasks','[]'::jsonb),pomodoro_history=coalesce(next_state->'pomodoro_history','{}'::jsonb),settings=next_state->'settings'
 where user_id=auth.uid() returning * into current_row;
 return jsonb_build_object('conflict',false,'row',to_jsonb(current_row));
end $$;
revoke all on function public.save_focus_state(timestamptz,jsonb) from public,anon;
grant execute on function public.save_focus_state(timestamptz,jsonb) to authenticated;
