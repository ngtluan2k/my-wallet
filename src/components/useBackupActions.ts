import { Alert } from 'react-native';

import { exportBackup, pickBackup } from '@/data/backupFile';
import { useT } from '@/i18n';
import { walletStore } from '@/state/wallet';

export function useBackupActions() {
  const { t } = useT();

  async function exportData() {
    const data = walletStore.getState().data;
    if (!data) return;
    try {
      if ((await exportBackup(data)) === 'unavailable') Alert.alert(t('settings.exportUnavailable'));
    } catch {
      Alert.alert(t('common.error'), t('settings.exportFailed'));
    }
  }

  /** Validates the picked file fully before asking to replace anything. */
  async function restoreData() {
    let result;
    try {
      result = await pickBackup();
    } catch {
      Alert.alert(t('common.error'), t('settings.importFailed'));
      return;
    }
    if (!result) return;
    if (!result.ok) {
      Alert.alert(t('common.error'), t(`settings.importError.${result.error}`));
      return;
    }
    const { data } = result;
    Alert.alert(t('settings.import'), t('settings.importConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.importConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await walletStore.getState().replaceAll(data);
            Alert.alert(t('settings.importSuccess', { count: data.transactions.length }));
          } catch {
            Alert.alert(t('common.error'), t('storage.saveFailed'));
          }
        },
      },
    ]);
  }

  return { exportData, restoreData };
}
