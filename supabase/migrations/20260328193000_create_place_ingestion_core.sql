create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.raw_places (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_id text not null,
  name_raw text,
  lat double precision,
  lng double precision,
  address_raw text,
  website_raw text,
  phone_raw text,
  category_raw text,
  raw_payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'normalized', 'review', 'rejected', 'error')),
  imported_at timestamptz not null default timezone('utc', now()),
  unique (source_name, source_id)
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category_primary text not null,
  category_secondary text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  website text,
  opening_hours text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'reviewed', 'verified', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.place_sources (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  raw_place_id uuid references public.raw_places(id) on delete set null,
  source_name text not null,
  source_id text not null,
  source_url text,
  is_primary boolean not null default false,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source_name, source_id)
);

create table if not exists public.place_images (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text,
  source_name text,
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.place_content (
  place_id uuid primary key references public.places(id) on delete cascade,
  short_text text,
  long_text text,
  tone_type text not null default 'guide',
  last_generated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.review_queue (
  id uuid primary key default gen_random_uuid(),
  raw_place_id uuid not null references public.raw_places(id) on delete cascade,
  candidate_place_id uuid references public.places(id) on delete set null,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'approved', 'merged', 'rejected')),
  notes text,
  score numeric(5, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists raw_places_imported_at_idx
  on public.raw_places (imported_at desc);

create index if not exists raw_places_category_raw_idx
  on public.raw_places (category_raw);

create index if not exists raw_places_coordinates_idx
  on public.raw_places (lat, lng);

create index if not exists places_status_idx
  on public.places (status, verification_status);

create index if not exists places_category_primary_idx
  on public.places (category_primary);

create index if not exists places_coordinates_idx
  on public.places (lat, lng);

create index if not exists place_sources_place_id_idx
  on public.place_sources (place_id);

create index if not exists place_sources_raw_place_id_idx
  on public.place_sources (raw_place_id);

create index if not exists place_images_place_id_sort_order_idx
  on public.place_images (place_id, sort_order);

create index if not exists review_queue_status_idx
  on public.review_queue (status, created_at desc);

create index if not exists review_queue_raw_place_id_idx
  on public.review_queue (raw_place_id);

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at
before update on public.places
for each row
execute function public.set_updated_at();

drop trigger if exists place_sources_set_updated_at on public.place_sources;
create trigger place_sources_set_updated_at
before update on public.place_sources
for each row
execute function public.set_updated_at();

drop trigger if exists place_images_set_updated_at on public.place_images;
create trigger place_images_set_updated_at
before update on public.place_images
for each row
execute function public.set_updated_at();

drop trigger if exists place_content_set_updated_at on public.place_content;
create trigger place_content_set_updated_at
before update on public.place_content
for each row
execute function public.set_updated_at();

drop trigger if exists review_queue_set_updated_at on public.review_queue;
create trigger review_queue_set_updated_at
before update on public.review_queue
for each row
execute function public.set_updated_at();

alter table public.raw_places enable row level security;
alter table public.places enable row level security;
alter table public.place_sources enable row level security;
alter table public.place_images enable row level security;
alter table public.place_content enable row level security;
alter table public.review_queue enable row level security;

drop policy if exists "Public can read published places" on public.places;
create policy "Public can read published places"
on public.places
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Public can read images for published places" on public.place_images;
create policy "Public can read images for published places"
on public.place_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.places
    where places.id = place_images.place_id
      and places.status = 'published'
  )
);

drop policy if exists "Public can read content for published places" on public.place_content;
create policy "Public can read content for published places"
on public.place_content
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.places
    where places.id = place_content.place_id
      and places.status = 'published'
  )
);
