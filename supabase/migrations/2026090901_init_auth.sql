-- Concern: authentication bootstrap state (single-row record).
-- Owner: src/server/mcp/infrastructure/database (SupabaseDatabaseRepository).
-- Apply order: filename version prefix (no cross-file dependencies).

create table if not exists public.app_bootstrap (
  id integer primary key,
  account text not null,
  credentials_changed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS is enabled with no public policies: only the service role (which
-- bypasses RLS) may read/write this row. The anon client must never touch
-- it, so the repository always prefers the service client.
alter table public.app_bootstrap enable row level security;

-- Seed the single bootstrap row (id = 1). Idempotent: safe to re-run.
-- The account is the documented fallback identity; the password itself is
-- never stored here and stays env-only. credentials_changed = false keeps
-- the dashboard rotation warning active until credentials are rotated.
insert into public.app_bootstrap (id, account, credentials_changed)
values (1, 'awesomemcp@getlib-local.com', false)
on conflict (id) do nothing;

-- Keep updated_at authoritative on every write.
create or replace function public.touch_app_bootstrap_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists touch_app_bootstrap_updated_at on public.app_bootstrap;
create trigger touch_app_bootstrap_updated_at
  before update on public.app_bootstrap
  for each row execute function public.touch_app_bootstrap_updated_at();
