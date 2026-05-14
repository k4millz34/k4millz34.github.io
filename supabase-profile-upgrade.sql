alter table public.profiles
add column if not exists avatar_url text not null default '';

alter table public.profiles
add column if not exists theme text not null default 'aqua';

alter table public.profiles
add column if not exists font_family text not null default 'system';

alter table public.profiles
add column if not exists card_shape text not null default 'window';

alter table public.profiles
add column if not exists avatar_shape text not null default 'rounded';

alter table public.profiles
add column if not exists link_style text not null default 'glass';

alter table public.profiles
add column if not exists background_effect text not null default 'grid';

alter table public.profiles
add column if not exists profile_animation text not null default 'float';

alter table public.profiles
add column if not exists name_effect text not null default 'glow';

alter table public.profiles
add column if not exists sticker_text text not null default '';

alter table public.profiles
alter column image_url set default '';

update public.profiles
set image_url = ''
where image_url ~ '^\.\./[0-9]+\.jpg$';

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
