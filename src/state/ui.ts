import { create } from 'zustand';

import { monthOf, today } from '@/domain/dates';
import type { MonthKey } from '@/domain/types';

/** Month shared by the Overview, Transactions and Budget tabs. */
export const useSelectedMonth = create<{ month: MonthKey; setMonth(month: MonthKey): void }>()((set) => ({
  month: monthOf(today()),
  setMonth: (month) => set({ month }),
}));
