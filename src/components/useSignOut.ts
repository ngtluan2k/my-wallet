import { Alert } from 'react-native';

import { useT } from '@/i18n';
import { useAuth } from '@/state/auth';
import { flushBeforeSignOut } from '@/state/session';

/** Pushes pending changes, then asks before signing out (warning if some are still unsynced). */
export function useSignOut() {
  const { t } = useT();
  return async function confirmSignOut() {
    const pending = await flushBeforeSignOut();
    Alert.alert(t('settings.signOut'), pending > 0 ? t('settings.signOutPending', { count: pending }) : t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: () => void useAuth.getState().signOut() },
    ]);
  };
}
