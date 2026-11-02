import type { Budget, Category, CategoryType, Transaction } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'exp-food', type: 'expense', builtInKey: 'food', icon: 'restaurant', color: '#F97316' },
  { id: 'exp-transport', type: 'expense', builtInKey: 'transport', icon: 'car', color: '#0EA5E9' },
  { id: 'exp-shopping', type: 'expense', builtInKey: 'shopping', icon: 'bag-handle', color: '#EC4899' },
  { id: 'exp-bills', type: 'expense', builtInKey: 'bills', icon: 'receipt', color: '#8B5CF6' },
  { id: 'exp-housing', type: 'expense', builtInKey: 'housing', icon: 'home', color: '#14B8A6' },
  { id: 'exp-health', type: 'expense', builtInKey: 'health', icon: 'medkit', color: '#EF4444' },
  { id: 'exp-education', type: 'expense', builtInKey: 'education', icon: 'school', color: '#6366F1' },
  { id: 'exp-entertainment', type: 'expense', builtInKey: 'entertainment', icon: 'game-controller', color: '#EAB308' },
  { id: 'exp-other', type: 'expense', builtInKey: 'otherExpense', icon: 'ellipsis-horizontal', color: '#64748B' },
  { id: 'inc-salary', type: 'income', builtInKey: 'salary', icon: 'briefcase', color: '#16A34A' },
  { id: 'inc-bonus', type: 'income', builtInKey: 'bonus', icon: 'gift', color: '#22C55E' },
  { id: 'inc-investment', type: 'income', builtInKey: 'investment', icon: 'trending-up', color: '#059669' },
  { id: 'inc-other', type: 'income', builtInKey: 'otherIncome', icon: 'ellipsis-horizontal', color: '#64748B' },
];

export const MAX_CATEGORY_NAME_LENGTH = 30;

/** Ionicons glyphs offered for user categories. */
export const CATEGORY_ICONS = [
  'restaurant', 'cafe', 'fast-food', 'beer', 'cart', 'bag-handle', 'shirt', 'car', 'bus', 'airplane',
  'bicycle', 'home', 'flash', 'water', 'wifi', 'phone-portrait', 'medkit', 'fitness', 'school', 'book',
  'game-controller', 'film', 'musical-notes', 'paw', 'heart', 'people', 'gift', 'briefcase', 'cash',
  'card', 'trending-up', 'construct', 'sparkles', 'pricetag', 'ellipsis-horizontal',
];

export const CATEGORY_COLORS = [
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6', '#6366F1', '#0EA5E9', '#14B8A6', '#16A34A', '#EAB308', '#64748B',
];

export interface CategoryInput {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export type CategoryError = 'name_required' | 'name_too_long' | 'name_taken';

/**
 * `takenNames`: display names of the other categories of the same type (built-in ones translated by
 * the caller). Comparison ignores case and surrounding spaces.
 */
export function validateCategoryInput(input: CategoryInput, takenNames: string[]): CategoryError[] {
  const name = input.name.trim();
  if (!name) return ['name_required'];
  if (name.length > MAX_CATEGORY_NAME_LENGTH) return ['name_too_long'];
  const folded = name.toLocaleLowerCase();
  if (takenNames.some((n) => n.trim().toLocaleLowerCase() === folded)) return ['name_taken'];
  return [];
}

export function addCategory(categories: Category[], input: CategoryInput, id: string): Category[] {
  return [...categories, { id, type: input.type, name: input.name.trim(), icon: input.icon, color: input.color }];
}

/** Only user categories can be edited; their type is fixed once created (transactions depend on it). */
export function editCategory(categories: Category[], id: string, input: Omit<CategoryInput, 'type'>): Category[] {
  const target = categories.find((c) => c.id === id);
  if (!target) throw new Error('not_found');
  if (target.builtInKey) throw new Error('built_in');
  return categories.map((c) => (c.id === id ? { ...c, name: input.name.trim(), icon: input.icon, color: input.color } : c));
}

export function categoryInUse(transactions: Transaction[], id: string): boolean {
  return transactions.some((t) => t.categoryId === id);
}

/** Deletes an unused user category together with its budget. */
export function deleteCategory(
  data: { categories: Category[]; transactions: Transaction[]; budgets: Budget[]; recurring?: { categoryId: string }[] },
  id: string,
): { categories: Category[]; budgets: Budget[] } {
  const target = data.categories.find((c) => c.id === id);
  if (!target) throw new Error('not_found');
  if (target.builtInKey) throw new Error('built_in');
  if (categoryInUse(data.transactions, id) || data.recurring?.some((r) => r.categoryId === id)) {
    throw new Error('category_in_use');
  }
  return {
    categories: data.categories.filter((c) => c.id !== id),
    budgets: data.budgets.filter((b) => b.categoryId !== id),
  };
}
