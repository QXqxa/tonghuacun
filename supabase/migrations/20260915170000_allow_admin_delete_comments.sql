grant delete on public.guestbook_comments to authenticated;

create policy "Admin deletes guestbook comments" on public.guestbook_comments
for delete to authenticated
using ((select auth.jwt() ->> 'email') = 'admin@tonghuacun.local');
