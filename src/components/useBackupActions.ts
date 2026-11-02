import { Alert } from 'react-native';

import { exportBackup, exportCsvFile, pickBackup } from '@/data/backupFile';
import { transactionsToCsv } from '@/domain/csv';
import { useT } from '@/i18n';
import { walletStore } from '@/state/wallet';

export function useBackupActions() {
  const { t, categoryName } = useT();

  async function exportData() {
    const data = walletStore.getState().data;
    if (!data) return;
    try {
      if ((await exportBackup(data)) === 'unavailable') Alert.alert(t('settings.exportUnavailable'));
    } catch {
      Alert.alert(t('common.error'), t('settings.exportFailed'));
    }
  }

  async function exportCsv() {
    const data = walletStore.getState().data;
    if (!data) return;
    const csv = transactionsToCsv(data.transactions, data.categories, data.wallets, {
      headers: [
        t('csv.date'),
        t('csv.time'),
        t('csv.type'),
        t('csv.amount'),
        t('csv.category'),
        t('csv.wallet'),
        t('csv.toWallet'),
        t('csv.note'),
      ],
      type: { expense: t('type.expense'), income: t('type.income'), transfer: t('type.transfer') },
      categoryName,
    });
    try {
      if ((await exportCsvFile(csv)) === 'unavailable') Alert.alert(t('settings.exportUnavailable'));
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

  return { exportData, exportCsv, restoreData };
}
