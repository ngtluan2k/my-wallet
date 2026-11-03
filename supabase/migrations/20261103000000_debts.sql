-- ============================================================================
-- Debts: money lent to or borrowed from a person (app data version 4). Same sync conventions as
-- the v2 tables: text ids chosen by the app, primary key (user_id, id), BIGINT đồng, soft delete
-- via deleted_at, server_updated_at as the pull cursor, RLS restricted to the owner.
-- ============================================================================

create table public.debts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  direction text not null check (direction in ('lent', 'borrowed')),
  person text not null check (char_length(person) between 1 and 60),
  amount bigint not null check (amount between 1 and 999999999999),
  wallet_id text not null,
  debt_date date not null,
  note text check (char_length(note) <= 500),
  settled_date date,
  settle_wallet_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  -- A settlement has both a date (not before the debt) and a wallet, or neither.
  check ((settled_date is null) = (settle_wallet_id is null)),
  check (settled_date is null or settled_date >= debt_date)
);

create trigger touch_server_updated_at before insert or update on public.debts
  for each row execute function public.touch_server_updated_at();

-- Pull query: where user_id = ? and server_updated_at > ? order by server_updated_at
create index debts_pull_idx on public.debts (user_id, server_updated_at);

alter table public.debts enable row level security;

create policy debts_select on public.debts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy debts_insert on public.debts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy debts_update on public.debts
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- No delete policy: clients soft-delete via deleted_at so other devices see the deletion.

revoke all on public.debts from anon;
grant select, insert, update on public.debts to authenticated;
