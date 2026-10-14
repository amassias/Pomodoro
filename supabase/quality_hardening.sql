-- Audit repair, 2026-10-14. No rows are modified or removed.
-- Feedback UI inserts only. Readers and administrators use a privileged backend.
revoke all privileges on public.feedback from anon, authenticated;
grant insert on public.feedback to anon, authenticated;
drop policy if exists "Users can view their own feedback" on public.feedback;
drop policy if exists "Anyone can insert feedback" on public.feedback;
create policy "Submit own or anonymous feedback" on public.feedback
for insert to anon, authenticated
with check (user_id is null or user_id = (select auth.uid()));

-- RLS alone does not guard table-wide TRUNCATE. Grant only the CRUD interface.
revoke all privileges on public.user_state from anon, authenticated;
grant select, insert, update, delete on public.user_state to authenticated;
alter function public.set_updated_at() set search_path = '';
