import { DEFAULT_CATEGORIES } from '../categories';
import { transactionsToCsv, type CsvLabels } from '../csv';
import type { Transaction, Wallet } from '../types';
import { createDefaultWallet } from '../wallets';

const now = new Date('2026-11-02T03:00:00Z');
const cash = createDefaultWallet('Ví chính', now);
const bank: Wallet = { ...cash, id: 'bank', name: 'Techcombank', isDefault: false };
const base = { createdAt: now.toISOString(), updatedAt: now.toISOString() };
const labels: CsvLabels = {
  headers: ['Ngày', 'Giờ', 'Loại', 'Số tiền', 'Danh mục', 'Ví', 'Ví nhận', 'Ghi chú'],
  type: { expense: 'Chi', income: 'Thu', transfer: 'Chuyển khoản' },
  categoryName: (c) => (c?.builtInKey === 'food' ? 'Ăn uống' : (c?.builtInKey ?? '')),
};

it('exports transactions newest first with signed amounts and escaped text', () => {
  const txs: Transaction[] = [
    { ...base, id: 'a', type: 'expense', amount: 45000, walletId: cash.id, categoryId: 'exp-food', transactionDate: '2026-11-01', transactionTime: '08:15', note: 'Cà phê, "Highlands"' },
    { ...base, id: 'b', type: 'transfer', amount: 500000, walletId: cash.id, toWalletId: 'bank', transactionDate: '2026-11-02' },
    { ...base, id: 'c', type: 'expense', amount: 1, walletId: cash.id, categoryId: 'exp-food', transactionDate: '2026-10-01', note: '=HYPERLINK("x")' },
  ];
  const csv = transactionsToCsv(txs, DEFAULT_CATEGORIES, [cash, bank], labels);
  expect(csv.startsWith('﻿')).toBe(true);
  expect(csv.slice(1).split('\r\n')).toEqual([
    'Ngày,Giờ,Loại,Số tiền,Danh mục,Ví,Ví nhận,Ghi chú',
    '2026-11-02,,Chuyển khoản,500000,,Ví chính,Techcombank,',
    '2026-11-01,08:15,Chi,-45000,Ăn uống,Ví chính,,"Cà phê, ""Highlands"""',
    `2026-10-01,,Chi,-1,Ăn uống,Ví chính,,"'=HYPERLINK(""x"")"`,
    '',
  ]);
});
