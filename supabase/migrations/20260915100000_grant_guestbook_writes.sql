grant insert (nickname, content, device_hash) on public.guestbook_messages to anon, authenticated;
grant usage, select on sequence public.guestbook_messages_id_seq to anon, authenticated;
grant insert (message_id, device_hash) on public.guestbook_likes to anon, authenticated;
