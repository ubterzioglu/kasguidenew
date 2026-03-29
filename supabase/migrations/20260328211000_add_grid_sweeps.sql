create table if not exists public.grid_sweeps (
  id uuid primary key default gen_random_uuid(),
  region_name text not null,
  preset_name text,
  origin_lat double precision not null,
  origin_lng double precision not null,
  bbox_south double precision not null,
  bbox_west double precision not null,
  bbox_north double precision not null,
  bbox_east double precision not null,
  cell_size_meters integer not null check (cell_size_meters > 0),
  total_cells integer not null default 0 check (total_cells >= 0),
  processed_cells integer not null default 0 check (processed_cells >= 0),
  successful_cells integer not null default 0 check (successful_cells >= 0),
  failed_cells integer not null default 0 check (failed_cells >= 0),
  status text not null default 'running'
    check (status in ('running', 'completed', 'partial', 'failed')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.grid_sweep_cells (
  id uuid primary key default gen_random_uuid(),
  sweep_id uuid not null references public.grid_sweeps(id) on delete cascade,
  cell_index integer not null,
  south double precision not null,
  west double precision not null,
  north double precision not null,
  east double precision not null,
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed')),
  fetched_count integer not null default 0,
  prepared_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (sweep_id, cell_index)
);

create index if not exists grid_sweeps_started_at_idx
  on public.grid_sweeps (started_at desc);

create index if not exists grid_sweeps_status_idx
  on public.grid_sweeps (status, started_at desc);

create index if not exists grid_sweep_cells_sweep_id_idx
  on public.grid_sweep_cells (sweep_id, cell_index);

create index if not exists grid_sweep_cells_status_idx
  on public.grid_sweep_cells (status, completed_at desc);

drop trigger if exists grid_sweeps_set_updated_at on public.grid_sweeps;
create trigger grid_sweeps_set_updated_at
before update on public.grid_sweeps
for each row
execute function public.set_updated_at();

drop trigger if exists grid_sweep_cells_set_updated_at on public.grid_sweep_cells;
create trigger grid_sweep_cells_set_updated_at
before update on public.grid_sweep_cells
for each row
execute function public.set_updated_at();

alter table public.grid_sweeps enable row level security;
alter table public.grid_sweep_cells enable row level security;