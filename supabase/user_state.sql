-- Run this in your Supabase SQL editor.
-- Creates a single per-user row to store app state (tasks, history, settings, city).

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,

  city text not null default 'seoul_hangang',
  tasks jsonb not null default '[]'::jsonb,
  archived_tasks jsonb not null default '[]'::jsonb,
  pomodoro_history jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at
before update on public.user_state
for each row
execute function public.set_updated_at();

-- Row Level Security: users can only access their own row.
alter table public.user_state enable row level security;

drop policy if exists user_state_select_own on public.user_state;
create policy user_state_select_own
on public.user_state
for select
using (auth.uid() = user_id);

drop policy if exists user_state_insert_own on public.user_state;
create policy user_state_insert_own
on public.user_state
for insert
with check (auth.uid() = user_id);

drop policy if exists user_state_update_own on public.user_state;
create policy user_state_update_own
on public.user_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_state_delete_own on public.user_state;
create policy user_state_delete_own
on public.user_state
for delete
using (auth.uid() = user_id);

-- Enable cross-device live updates. Safe to run repeatedly.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_state'
  ) then
    alter publication supabase_realtime add table public.user_state;
  end if;
end
$$;
