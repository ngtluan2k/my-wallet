import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import DebtEditScreen from '@/app/debt-edit';
import DebtsScreen from '@/app/debts';
import { MemoryRepository } from '@/data/memoryRepository';
import { createInitialData } from '@/domain/walletData';
import { walletBalance } from '@/domain/wallets';
import { useSettings } from '@/state/settings';
import { walletStore } from '@/state/wallet';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  Stack: { Screen: () => null },
}));
jest.mock('@react-native-community/datetimepicker', () => () => null);

const params = useLocalSearchParams as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  params.mockReturnValue({});
  useSettings.setState({ language: 'vi', theme: 'light', loaded: true });
  const data = createInitialData('Ví chính', new Date('2026-11-02T03:00:00Z'));
  await walletStore.getState().open(new MemoryRepository({ ...data, wallets: [{ ...data.wallets[0], openingBalance: 1_000_000 }] }));
});

const cashBalance = () => {
  const data = walletStore.getState().data!;
  return walletBalance(data.wallets[0], data.transactions, data.debts);
};

describe('debt screens', () => {
  it('asks for a name, then saves a loan that takes money out of the wallet', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<DebtEditScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('0'), '300000');

    await fireEvent.press(screen.getByText('Lưu'));
    expect(alert).toHaveBeenCalledWith('Đã có lỗi', 'Nhập tên người.');
    expect(walletStore.getState().data?.debts).toEqual([]);

    await fireEvent.changeText(screen.getByPlaceholderText('Ví dụ: Minh'), 'Minh');
    await fireEvent.press(screen.getByText('Lưu'));
    expect(walletStore.getState().data?.debts).toEqual([
      expect.objectContaining({ direction: 'lent', person: 'Minh', amount: 300_000, walletId: 'wallet-default' }),
    ]);
    expect(cashBalance()).toBe(700_000);
    expect(router.back).toHaveBeenCalled();
  });

  it('settles a debt in full and can reopen it', async () => {
    const id = await walletStore
      .getState()
      .addDebt({ direction: 'borrowed', person: 'Lan', amount: 200_000, walletId: 'wallet-default', date: '2026-11-01' });
    expect(cashBalance()).toBe(1_200_000);
    params.mockReturnValue({ id });
    await render(<DebtEditScreen />);

    await fireEvent.press(screen.getByText('Đánh dấu đã trả hết'));
    await fireEvent.press(screen.getByText('Xác nhận đã trả'));
    expect(walletStore.getState().data?.debts[0].settleWalletId).toBe('wallet-default');
    expect(cashBalance()).toBe(1_000_000);

    await fireEvent.press(screen.getByText('Đánh dấu chưa trả'));
    expect(walletStore.getState().data?.debts[0].settledDate).toBeUndefined();
  });

  it('shows open totals per direction', async () => {
    await walletStore.getState().addDebt({ direction: 'lent', person: 'Minh', amount: 300_000, walletId: 'wallet-default', date: '2026-11-01' });
    await walletStore.getState().addDebt({ direction: 'borrowed', person: 'Lan', amount: 50_000, walletId: 'wallet-default', date: '2026-11-01' });
    await render(<DebtsScreen />);
    expect(screen.getByText('Minh')).toBeTruthy();
    expect(screen.queryByText('Lan')).toBeNull();
    expect(screen.getAllByText('300.000 ₫').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByText('Mình nợ'));
    expect(screen.getByText('Lan')).toBeTruthy();
    expect(screen.getByText('Còn phải trả')).toBeTruthy();
  });
});
