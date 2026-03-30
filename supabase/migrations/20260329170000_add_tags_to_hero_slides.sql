alter table public.hero_slides
  add column if not exists tags text[] not null default '{}'::text[];