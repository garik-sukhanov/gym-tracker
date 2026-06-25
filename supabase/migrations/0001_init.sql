-- Схема для облачной синхронизации (sessions / sets).
-- Применить можно в Supabase Dashboard → SQL Editor, либо через `supabase db push`.

create table if not exists sessions (
  id uuid primary key,
  title text,
  started_at timestamptz not null,
  ended_at timestamptz,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create table if not exists sets (
  id uuid primary key,
  session_id uuid not null,
  machine_number int,
  machine_name text not null,
  weight numeric,
  reps int,
  set_index int not null,
  rpe numeric,
  note text,
  performed_at timestamptz not null,
  updated_at timestamptz not null,
  deleted boolean not null default false
);

create index if not exists sets_updated_at_idx on sets (updated_at);
create index if not exists sessions_updated_at_idx on sessions (updated_at);
