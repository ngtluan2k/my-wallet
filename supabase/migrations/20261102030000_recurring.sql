-- ============================================================================
-- Recurring transactions (app data version 3). Same sync conventions as the v2 tables:
-- text ids chosen by the app, primary key (user_id, id), BIGINT đồng, soft delete via
-- deleted_at, server_updated_at as the pull cursor, RLS restricted to the owner.
-- Occurrences are ordinary rows in public.transactions with id '<rule id>@<YYYY-MM-DD>'.
-- ============================================================================

create table public.recurring (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  type text not null check (type in ('income', 'expense')),
  amount bigint not null check (amount between 1 and 999999999999),
  wallet_id text not null,
  category_id text not null,
  note text check (char_length(note) <= 500),
  frequency text not null check (frequency in ('weekly', 'monthly')),
  start_date date not null,
  next_date date not null check (next_date >= start_date),
  paused boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create trigger touch_server_updated_at before insert or update on public.recurring
  for each row execute function public.touch_server_updated_at();

-- Pull query: where user_id = ? and server_updated_at > ? order by server_updated_at
create index recurring_pull_idx on public.recurring (user_id, server_updated_at);

alter table public.recurring enable row level security;

create policy recurring_select on public.recurring
  for select to authenticated using ((select auth.uid()) = user_id);
create policy recurring_insert on public.recurring
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy recurring_update on public.recurring
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No delete policy: clients soft-delete via deleted_at so other devices see the deletion.

revoke all on public.recurring from anon;
grant select, insert, update on public.recurring to authenticated;
