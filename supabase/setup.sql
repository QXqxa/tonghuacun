-- Run once in the Supabase SQL Editor after creating the project.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public photo viewing" on storage.objects;
create policy "Public photo viewing"
on storage.objects for select
to public
using (bucket_id = 'photos');

drop policy if exists "Signed-in owner uploads" on storage.objects;
create policy "Signed-in owner uploads"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photos' and owner_id = (select auth.uid()::text));
