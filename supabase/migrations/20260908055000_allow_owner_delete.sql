drop policy if exists "Signed-in owner deletes" on storage.objects;
create policy "Signed-in owner deletes"
on storage.objects for delete
to authenticated
using (bucket_id = 'photos' and owner_id = (select auth.uid()::text));
