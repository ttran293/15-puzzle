-- Sliding Puzzle — Supabase schema (run in SQL Editor)

create table if not exists public.puzzle (
  id int primary key check (id = 1),
  tiles int[] not null,
  image_id int not null,
  moves_count int not null default 0,
  last_move_at timestamptz,
  is_won boolean not null default false,
  won_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.move_log (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 30),
  tile_index int not null,
  tile_number int not null,
  created_at timestamptz not null default now()
);

create index if not exists move_log_created_at_idx
  on public.move_log (created_at desc);
