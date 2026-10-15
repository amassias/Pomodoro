create table if not exists public.focus_rooms (
 id text primary key, invite_hash text not null, host_id text not null,
 locked boolean not null default false, expires_at timestamptz not null,
 members jsonb not null default '{}', messages jsonb not null default '[]', timer jsonb
);
alter table public.focus_rooms enable row level security;
revoke all on public.focus_rooms from public,anon,authenticated;
create or replace function public.focus_room(p_action text,p_id text,p_key text,p_member text,p_profile jsonb default '{}',p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.focus_rooms; member_id text; invite text; m jsonb; member_info jsonb; target text; fresh_members jsonb; clean_message jsonb; host_seen timestamptz;
begin
 if octet_length(p_payload::text)>8192 or octet_length(p_profile::text)>1024 then raise exception 'Payload too large';end if;
 if p_id !~ '^[a-z0-9]{8}$' or length(p_key)<16 or length(p_key)>128 or length(p_member)<32 or length(p_member)>128 then raise exception 'Invalid room credentials'; end if;
 member_id:=encode(sha256(convert_to(p_member,'UTF8')),'hex');invite:=encode(sha256(convert_to(p_key,'UTF8')),'hex');
 if p_action='create' then
  delete from public.focus_rooms where expires_at<now();
  insert into public.focus_rooms(id,invite_hash,host_id,expires_at) values(p_id,invite,member_id,now()+interval '4 hours');
 end if;
 select * into r from public.focus_rooms where id=p_id and invite_hash=invite and expires_at>now() for update;
 if not found then raise exception 'Room unavailable or expired'; end if;
 member_info:=r.members->member_id;
 if coalesce((member_info->>'banned')::boolean,false) then raise exception 'Removed from this room';end if;
 if p_action in ('join','create') then
  if member_info is null and r.locked then raise exception 'Room locked';end if;
  if member_info is null and (select count(*) from jsonb_object_keys(r.members))>=50 then raise exception 'Room full';end if;
  member_info:=jsonb_build_object('id',member_id,'name',left(coalesce(p_profile->>'name','Focus friend'),40),'avatar',left(coalesce(p_profile->>'avatar','🌱'),12),'ready',false,'last_seen',now());
 elsif member_info is null then raise exception 'Join the room first';end if;
 if p_action='leave' then
  update public.focus_rooms set members=members-member_id where id=p_id;return '{}';
 end if;
 member_info:=member_info||jsonb_build_object('last_seen',now());
 r.members:=jsonb_set(r.members,array[member_id],member_info);
 host_seen:=(r.members->r.host_id->>'last_seen')::timestamptz;
 if host_seen is null or host_seen<now()-interval '45 seconds' then r.host_id:=member_id;end if;
 if p_action='lock' then
  if r.host_id<>member_id then raise exception 'Host required';end if;
  r.locked:=coalesce((p_payload->>'locked')::boolean,false);
 elsif p_action='kick' then
  if r.host_id<>member_id then raise exception 'Host required';end if;
  target:=p_payload->>'targetId';if target=member_id then raise exception 'Cannot remove yourself';end if;
  if r.members?target then r.members:=jsonb_set(r.members,array[target,'banned'],'true');end if;
 elsif p_action='ready' then
  r.members:=jsonb_set(r.members,array[member_id,'ready'],coalesce(p_payload->'ready','false'));
 elsif p_action='timer' then
  if r.host_id<>member_id then raise exception 'Host required';end if;
  if coalesce(p_payload->>'mode','') not in ('focus','shortBreak','longBreak') or jsonb_typeof(p_payload->'remainingMs') is distinct from 'number' or (p_payload->>'remainingMs')::numeric<0 or (p_payload->>'remainingMs')::numeric>86400000 or jsonb_typeof(p_payload->'isActive') is distinct from 'boolean' then raise exception 'Invalid timer';end if;
  if (p_payload->>'isActive')::boolean and (jsonb_typeof(p_payload->'endAt') is distinct from 'number' or (p_payload->>'endAt')::numeric>extract(epoch from now()+interval '1 day')*1000) then raise exception 'Invalid deadline';end if;
  r.timer:=p_payload;
 elsif p_action='message' then
  if member_info?'last_message' and (member_info->>'last_message')::timestamptz>now()-interval '1 second' then raise exception 'Please wait before sending another message';end if;
  if coalesce(p_payload->>'type','') not in ('message','reaction','activity') or length(trim(coalesce(p_payload->>'text','')))=0 then raise exception 'Invalid message';end if;
  clean_message:=jsonb_build_object('id',gen_random_uuid(),'type',p_payload->>'type','text',left(p_payload->>'text',280),'senderId',member_id,'senderName',member_info->>'name','senderAvatar',member_info->>'avatar','at',extract(epoch from now())*1000);
  r.messages:=r.messages||jsonb_build_array(clean_message);
  select coalesce(jsonb_agg(value order by ord),'[]') into r.messages from jsonb_array_elements(r.messages) with ordinality a(value,ord) where ord>jsonb_array_length(r.messages)-100;
  r.members:=jsonb_set(r.members,array[member_id,'last_message'],to_jsonb(now()));
 elsif p_action not in ('create','join','snapshot') then raise exception 'Invalid room action';
 end if;
 update public.focus_rooms set members=r.members,messages=r.messages,host_id=r.host_id,locked=r.locked,timer=r.timer where id=p_id;
 select coalesce(jsonb_agg(value||jsonb_build_object('role',case when key=r.host_id then 'host' else 'guest' end)),'[]') into fresh_members from jsonb_each(r.members) where not coalesce((value->>'banned')::boolean,false) and (value->>'last_seen')::timestamptz>now()-interval '45 seconds';
 return jsonb_build_object('participants',fresh_members,'messages',r.messages,'locked',r.locked,'isHost',r.host_id=member_id,'timer',r.timer,'expiresAt',extract(epoch from r.expires_at)*1000,'memberId',member_id);
end $$;
revoke all on function public.focus_room(text,text,text,text,jsonb,jsonb) from public;
grant execute on function public.focus_room(text,text,text,text,jsonb,jsonb) to anon,authenticated;
