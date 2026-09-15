create table if not exists public.guestbook_messages (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 20),
  content text not null check (char_length(content) between 1 and 160),
  device_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.guestbook_likes (
  message_id bigint not null references public.guestbook_messages(id) on delete cascade,
  device_hash text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, device_hash)
);

alter table public.guestbook_messages enable row level security;
alter table public.guestbook_likes enable row level security;

create policy "Public reads guestbook messages" on public.guestbook_messages
for select to anon, authenticated using (true);
create policy "Public posts one guestbook message" on public.guestbook_messages
for insert to anon, authenticated with check (true);
create policy "Public reads guestbook likes" on public.guestbook_likes
for select to anon, authenticated using (true);
create policy "Public likes guestbook messages once" on public.guestbook_likes
for insert to anon, authenticated with check (true);
