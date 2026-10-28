import type { Category } from './types';

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
