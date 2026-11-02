import { Redirect } from 'expo-router';

import { useAuth } from '@/state/auth';

/**
 * Any URL that matches no available route (a stale deep link, or a guarded screen right after
 * signing in/out) goes back to the right starting screen instead of showing "Unmatched Route".
 */
export default function NotFound() {
  const user = useAuth((s) => s.user);
  if (user === undefined) return null; // auth still loading; the root layout shows a spinner
  return <Redirect href={user ? '/' : '/login'} />;
}
