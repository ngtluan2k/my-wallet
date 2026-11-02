import {
  addCategory,
  categoryInUse,
  DEFAULT_CATEGORIES,
  deleteCategory,
  editCategory,
  validateCategoryInput,
  type CategoryInput,
} from '../categories';
import type { Transaction } from '../types';

const input: CategoryInput = { name: ' Cà phê ', type: 'expense', icon: 'cafe', color: '#F97316' };
const used: Transaction = {
  id: 't1',
  type: 'expense',
  amount: 10_000,
  walletId: 'wallet-default',
  categoryId: 'cafe',
  transactionDate: '2026-11-01',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

describe('user categories', () => {
  it('validates names against the other categories, ignoring case', () => {
    expect(validateCategoryInput({ ...input, name: '  ' }, [])).toEqual(['name_required']);
    expect(validateCategoryInput({ ...input, name: 'x'.repeat(31) }, [])).toEqual(['name_too_long']);
    expect(validateCategoryInput(input, ['CÀ PHÊ'])).toEqual(['name_taken']);
    expect(validateCategoryInput(input, ['Ăn uống'])).toEqual([]);
  });

  it('adds, edits and deletes an unused user category with its budget', () => {
    const added = addCategory(DEFAULT_CATEGORIES, input, 'cafe');
    expect(added.at(-1)).toEqual({ id: 'cafe', type: 'expense', name: 'Cà phê', icon: 'cafe', color: '#F97316' });

    const edited = editCategory(added, 'cafe', { name: 'Trà sữa', icon: 'beer', color: '#EC4899' });
    expect(edited.at(-1)).toMatchObject({ name: 'Trà sữa', icon: 'beer', type: 'expense' });

    const result = deleteCategory({ categories: edited, transactions: [], budgets: [{ categoryId: 'cafe', limit: 1 }] }, 'cafe');
    expect(result.categories).toEqual(DEFAULT_CATEGORIES);
    expect(result.budgets).toEqual([]);
  });

  it('protects built-in and used categories', () => {
    const added = addCategory(DEFAULT_CATEGORIES, input, 'cafe');
    expect(categoryInUse([used], 'cafe')).toBe(true);
    expect(() => deleteCategory({ categories: added, transactions: [used], budgets: [] }, 'cafe')).toThrow('category_in_use');
    expect(() => deleteCategory({ categories: added, transactions: [], budgets: [] }, 'exp-food')).toThrow('built_in');
    expect(() => editCategory(added, 'exp-food', input)).toThrow('built_in');
  });
});
