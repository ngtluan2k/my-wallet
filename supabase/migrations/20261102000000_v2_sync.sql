-- ============================================================================
-- Ví Mình — v2 sync schema
--
-- The app keeps its data in a local JSON file per user and syncs record by record (see
-- src/domain/sync.ts). These tables mirror the app's data model:
--   * ids are TEXT chosen by the app (built-in categories use fixed ids such as 'exp-food'),
--     so the primary key is (user_id, id);
--   * money is BIGINT đồng, never NUMERIC/float;
--   * deletes are soft (deleted_at) so other devices can pull them;
--   * server_updated_at is set by the server on every write and is the pull cursor.
--
-- WARNING: this drops the v1 domain tables (wallets, categories, transactions, budgets,
-- savings_goals, sync_queue). They were only used by development builds. users/profiles are kept.
-- ============================================================================

drop table if exists public.sync_queue cascade;
drop table if exists public.savings_goals cascade;
drop table if exists public.budgets cascade;
drop table if exists public.transactions cascade;
drop table if exists public.categories cascade;
drop table if exists public.wallets cascade;

-- Server-side write time; clients pull rows with server_updated_at after their cursor.
create or replace function public.touch_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- wallets
-- ---------------------------------------------------------------------------
create table public.wallets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null check (kind in ('cash', 'bank', 'ewallet')),
  icon text not null,
  color text not null,
  opening_balance bigint not null check (opening_balance between 0 and 999999999999),
  is_default boolean not null,
  archived boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ---------------------------------------------------------------------------
-- categories (built-in ones are stored per user too, so every row is owned)
-- ---------------------------------------------------------------------------
create table public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  type text not null check (type in ('income', 'expense')),
  built_in_key text,
  name text,
  icon text not null,
  color text not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (built_in_key is not null or name is not null)
);

-- ---------------------------------------------------------------------------
-- transactions
-- No foreign keys to wallets/categories: the client validates references before accepting
-- data, and pushes may arrive in any order after outbox compaction.
-- ---------------------------------------------------------------------------
create table public.transactions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount bigint not null check (amount between 1 and 999999999999),
  wallet_id text not null,
  to_wallet_id text,
  category_id text,
  transaction_date date not null,
  transaction_time text check (transaction_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (
    (type = 'transfer' and to_wallet_id is not null and to_wallet_id <> wallet_id and category_id is null)
    or (type <> 'transfer' and category_id is not null and to_wallet_id is null)
  )
);

-- ---------------------------------------------------------------------------
-- budgets: one monthly limit per expense category, applied to every month
-- ---------------------------------------------------------------------------
create table public.budgets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id text not null,
  limit_amount bigint not null check (limit_amount between 1 and 999999999999),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Triggers, indexes, RLS (same pattern for each table)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['wallets', 'categories', 'transactions', 'budgets'] loop
    execute format(
      'create trigger touch_server_updated_at before insert or update on public.%I
         for each row execute function public.touch_server_updated_at()', t);

    -- Pull query: where user_id = ? and server_updated_at > ? order by server_updated_at
    execute format('create index %I on public.%I (user_id, server_updated_at)', t || '_pull_idx', t);

    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update', t);
    -- No delete policy: clients soft-delete via deleted_at so other devices see the deletion.

    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end;
$$;
