import { fireEvent, render, screen } from '@testing-library/react-native';

import ReportScreen from '@/app/report';
import { MemoryRepository } from '@/data/memoryRepository';
import { monthOf, today } from '@/domain/dates';
import { createTransaction } from '@/domain/transactions';
import { createInitialData } from '@/domain/walletData';
import { useSettings } from '@/state/settings';
import { walletStore } from '@/state/wallet';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/state/session', () => ({ useSync: () => ({ status: 'idle', pending: 0 }), syncNow: jest.fn() }));

const now = new Date('2026-11-02T03:00:00Z');

beforeEach(async () => {
  useSettings.setState({ language: 'vi', theme: 'light', loaded: true });
  const month = monthOf(today());
  const tx = (id: string, type: 'income' | 'expense', amount: number, categoryId: string) =>
    createTransaction({ type, amount, walletId: 'wallet-default', categoryId, transactionDate: `${month}-01` }, id, now);
  await walletStore.getState().open(
    new MemoryRepository({
      ...createInitialData('Ví chính', now),
      transactions: [tx('a', 'income', 10_000_000, 'inc-salary'), tx('b', 'expense', 2_500_000, 'exp-housing')],
    }),
  );
});

it('switches to the monthly report with savings rate and top categories', async () => {
  await render(<ReportScreen />);
  expect(screen.getByText('Tuần này')).toBeTruthy();

  await fireEvent.press(screen.getByText('Tháng'));
  expect(screen.getByText('Tháng này')).toBeTruthy();
  expect(screen.getByText('Tỷ lệ tiết kiệm')).toBeTruthy();
  expect(screen.getByText('75%')).toBeTruthy();
  expect(screen.getByText('Nhà ở')).toBeTruthy();
  // Reports never go into the future.
  expect(screen.getByLabelText('Kỳ sau')).toBeDisabled();
});
