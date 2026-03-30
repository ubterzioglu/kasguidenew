create table if not exists public.hero_slides (
  id text primary key,
  eyebrow text not null,
  title text not null,
  description text not null,
  tags text[] not null default '{}'::text[],
  image_url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists hero_slides_sort_order_idx
  on public.hero_slides (sort_order);

create or replace function public.set_hero_slides_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists hero_slides_set_updated_at on public.hero_slides;

create trigger hero_slides_set_updated_at
before update on public.hero_slides
for each row
execute function public.set_hero_slides_updated_at();