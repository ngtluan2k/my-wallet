-- ============================================================================
-- Cleanup: public.users and public.profiles came from the v1 schema and were only filled by the
-- signup trigger removed in 20261102010000. The app keeps the display name in auth user metadata
-- (user_metadata.full_name) and settings on the device, so nothing reads or writes these tables.
-- Dropping them removes a stale copy of every user's email and name.
-- ============================================================================

drop table if exists public.profiles cascade;
drop table if exists public.users cascade;

-- The v1 updated_at trigger function is no longer attached to any table.
drop function if exists public.handle_updated_at();
