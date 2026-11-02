-- ============================================================================
-- Fix: sign-up failed with "Database error saving new user".
--
-- The v1 schema added an AFTER INSERT trigger on auth.users (handle_new_user) that seeded a
-- default wallet and categories in the v1 table shape. The v2_sync migration recreated
-- public.wallets and public.categories with a different shape (text ids, kind/icon/color,
-- no is_system column) but left the trigger in place, so every insert into auth.users failed
-- and Supabase rolled back the whole sign-up.
--
-- The app now creates the default wallet and built-in categories itself on first sign-in and
-- syncs them up (the first sync only pushes what the server lacks), so the server must not seed
-- anything. public.users / public.profiles are no longer used by the app; nothing writes to them.
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
