create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_-]{3,24}$'),
  display_name text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  name_color text not null default '#7df9ff',
  name_size integer not null default 78 check (name_size between 42 and 112),
  theme text not null default 'aqua',
  font_family text not null default 'system',
  card_shape text not null default 'window',
  avatar_shape text not null default 'rounded',
  link_style text not null default 'glass',
  background_effect text not null default 'grid',
  profile_animation text not null default 'float',
  name_effect text not null default 'glow',
  sticker_text text not null default '',
  image_url text not null default '',
  video_url text not null default '',
  music_url text not null default '',
  overlay numeric not null default 0.52 check (overlay >= 0 and overlay <= 0.9),
  blur boolean not null default false,
  links jsonb not null default '[]'::jsonb,
  hidden boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_profile_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.id = old.id;
  new.is_admin = old.is_admin;
  new.hidden = old.hidden;
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_protect_flags on public.profiles;
create trigger profiles_protect_flags
before update on public.profiles
for each row execute function public.protect_profile_flags();

drop policy if exists "Public can read visible profiles" on public.profiles;
create policy "Public can read visible profiles"
on public.profiles
for select
using (hidden = false or id = auth.uid() or public.is_admin());

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles
for insert
with check (id = auth.uid() and hidden = false and is_admin = false);

drop policy if exists "Owners and admins can update profiles" on public.profiles;
create policy "Owners and admins can update profiles"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Owners and admins can delete profiles" on public.profiles;
create policy "Owners and admins can delete profiles"
on public.profiles
for delete
using (id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatars" on storage.objects;
create policy "Users can upload own avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Apres avoir cree ton compte sur le site avec le pseudo k4millz,
-- lance cette ligne une seule fois pour devenir admin :
-- update public.profiles set is_admin = true where username = 'k4millz';
