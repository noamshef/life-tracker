create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  date text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_entries enable row level security;

create policy "Allow anonymous read/write for daily entries"
on public.daily_entries
for all
using (true)
with check (true);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_daily_entries_updated_at on public.daily_entries;
create trigger set_daily_entries_updated_at
before update on public.daily_entries
for each row
execute function public.set_updated_at();
