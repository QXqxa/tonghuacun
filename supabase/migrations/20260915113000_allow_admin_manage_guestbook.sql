alter table public.guestbook_messages add column if not exists updated_at timestamptz;

grant select (updated_at) on public.guestbook_messages to anon, authenticated;
grant update (nickname, content, updated_at) on public.guestbook_messages to authenticated;
grant delete on public.guestbook_messages to authenticated;

create policy "Admin edits guestbook messages" on public.guestbook_messages
for update to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@tonghuacun.local')
with check ((select auth.jwt() ->> 'email') = 'admin@tonghuacun.local');

create policy "Admin deletes guestbook messages" on public.guestbook_messages
for delete to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@tonghuacun.local');
