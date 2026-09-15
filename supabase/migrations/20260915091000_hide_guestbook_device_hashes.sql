revoke select on public.guestbook_messages from anon, authenticated;
grant select (id, nickname, content, created_at) on public.guestbook_messages to anon, authenticated;

revoke select on public.guestbook_likes from anon, authenticated;
grant select (message_id, created_at) on public.guestbook_likes to anon, authenticated;
