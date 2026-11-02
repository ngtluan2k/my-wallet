import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import TransactionScreen from '@/app/transaction';
import { MemoryRepository } from '@/data/memoryRepository';
import { createInitialData } from '@/domain/walletData';
import { useSettings } from '@/state/settings';
import { walletStore } from '@/state/wallet';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
// The session pulls in file storage and Supabase; the screen only needs the sync chip's state.
jest.mock('@/state/session', () => ({ useSync: () => ({ status: 'idle', pending: 0 }), syncNow: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => () => null);

const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

beforeEach(async () => {
  jest.clearAllMocks();
  useSettings.setState({ language: 'vi', theme: 'light', loaded: true });
  await walletStore.getState().open(new MemoryRepository(createInitialData('Ví chính', new Date('2026-11-02T03:00:00Z'))));
});

describe('add transaction screen', () => {
  it('types amounts on the numpad, adds quick amounts and reads the amount in words', async () => {
    await render(<TransactionScreen />);
    await press('1');
    await press('2');
    await press('000');
    expect(screen.getByText('12.000 ₫')).toBeTruthy();
    expect(screen.getByText('Mười hai nghìn đồng')).toBeTruthy();

    // Quick amounts add to the current amount instead of appending digits.
    await fireEvent.press(screen.getByText('+50.000 ₫'));
    expect(screen.getByText('62.000 ₫')).toBeTruthy();

    await press('⌫');
    expect(screen.getByText('6.200 ₫')).toBeTruthy();
    await press('C');
    expect(screen.getByText('0 ₫')).toBeTruthy();
  });

  it('asks for a category, then saves the transaction and closes', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<TransactionScreen />);
    await press('5');
    await press('000');

    await press('Xong');
    expect(alert).toHaveBeenCalledWith('Đã có lỗi', 'Chọn một danh mục.');
    expect(walletStore.getState().data?.transactions).toEqual([]);

    await fireEvent.press(screen.getByText('Ăn uống'));
    await press('Xong');
    expect(walletStore.getState().data?.transactions).toEqual([
      expect.objectContaining({ type: 'expense', amount: 5000, categoryId: 'exp-food', walletId: 'wallet-default' }),
    ]);
    expect(router.back).toHaveBeenCalled();
  });

  it('warns that a transfer needs a second wallet', async () => {
    await render(<TransactionScreen />);
    await fireEvent.press(screen.getByText('Chuyển khoản'));
    expect(screen.getByText('Chuyển khoản cần ít nhất hai ví.')).toBeTruthy();
  });
});
