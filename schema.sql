-- DesignUp 2026 island: run this once in Supabase → SQL Editor.
-- Then add yourself as moderator at the bottom (replace the email).

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path text not null,
  talk text, day text,
  caption text check (char_length(caption) <= 200),
  author text not null check (char_length(author) between 1 and 80),
  linkedin text check (linkedin is null or linkedin ~ '^https://'),
  status text not null default 'pending' check (status in ('pending','approved','rejected','hidden')),
  created_at timestamptz not null default now()
);
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  talk text not null,
  kind text not null check (kind in ('learning','comment','question')),
  body text not null check (char_length(body) between 1 and 1000),
  author text not null check (char_length(author) between 1 and 80),
  linkedin text check (linkedin is null or linkedin ~ '^https://'),
  status text not null default 'pending' check (status in ('pending','approved','rejected','hidden')),
  created_at timestamptz not null default now()
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('photo','note')),
  item_id uuid not null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  unique (kind, item_id, user_id)
);
create table if not exists public.admins (email text primary key);

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.photos  enable row level security;
alter table public.notes   enable row level security;
alter table public.reports enable row level security;
alter table public.admins  enable row level security;

-- everyone can read approved items; you can also see your own; moderators see everything
create policy photos_read   on public.photos for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy photos_add    on public.photos for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy photos_mod    on public.photos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy photos_del    on public.photos for delete to authenticated using (user_id = auth.uid() or public.is_admin());
create policy notes_read    on public.notes  for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy notes_add     on public.notes  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
create policy notes_mod     on public.notes  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy notes_del     on public.notes  for delete to authenticated using (user_id = auth.uid() or public.is_admin());
create policy reports_add   on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy reports_read  on public.reports for select to authenticated using (public.is_admin());

-- limit how fast one person can post
create or replace function public.rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
declare n int; cap int := case tg_table_name when 'photos' then 40 else 20 end;
begin
  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 hour''', tg_table_name) into n using new.user_id;
  if n >= cap then raise exception 'rate limit: try again later'; end if;
  return new;
end $$;
create trigger photos_rate before insert on public.photos for each row execute function public.rate_limit();
create trigger notes_rate  before insert on public.notes  for each row execute function public.rate_limit();

-- 3 different people report an approved item and it is hidden until a moderator looks
create or replace function public.auto_hide() returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.reports where kind = new.kind and item_id = new.item_id;
  if n >= 3 then
    if new.kind = 'photo' then update public.photos set status = 'hidden' where id = new.item_id and status = 'approved';
    else update public.notes set status = 'hidden' where id = new.item_id and status = 'approved'; end if;
  end if;
  return new;
end $$;
create trigger reports_hide after insert on public.reports for each row execute function public.auto_hide();

-- photo storage: public bucket, small JPEGs only, each person writes only into their own folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 600000, array['image/jpeg'])
on conflict (id) do update set file_size_limit = 600000, allowed_mime_types = array['image/jpeg'];
create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_remove on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- moderators: put your own email here (the one you sign in with)
insert into public.admins (email) values ('vimaleshrmallya@gmail.com') on conflict do nothing;
