import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { readProvisionExpiry } from '@/data/provisioning';
import { daysUntil } from '@/domain/provisioning';

const expiryPromise = readProvisionExpiry();

/** Signing expiry for sideloaded builds; null when the build has none. Re-evaluated on foreground. */
export function useSigningExpiry(): { expiry: Date; daysLeft: number } | null {
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    expiryPromise.then(setExpiry);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => subscription.remove();
  }, []);

  return expiry ? { expiry, daysLeft: daysUntil(expiry, now) } : null;
}
