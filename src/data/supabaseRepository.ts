import { supabase } from './supabaseClient';
import type { WalletData, Category, Transaction, Budget } from '@/domain/types';
import type { WalletRepository } from './WalletRepository';

export class SupabaseRepository implements WalletRepository {
  async load(): Promise<WalletData> {
    const [txRes, catRes, budRes] = await Promise.all([
      supabase.from('transactions').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('budgets').select('*'),
    ]);

    if (txRes.error) throw new Error(txRes.error.message);
    if (catRes.error) throw new Error(catRes.error.message);
    if (budRes.error) throw new Error(budRes.error.message);

    const categories: Category[] = (catRes.data ?? []).map((c: any) => ({
      id: c.id,
      type: c.type,
      builtInKey: c.built_in_key ?? undefined,
      name: c.name ?? undefined,
      icon: c.icon,
      color: c.color,
    }));

    const transactions: Transaction[] = (txRes.data ?? []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      categoryId: t.category_id,
      transactionDate: t.transaction_date,
      note: t.note ?? undefined,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    const budgets: Budget[] = (budRes.data ?? []).map((b: any) => ({
      categoryId: b.category_id,
      limit: b.limit_amount,
    }));

    return { version: 1, transactions, categories, budgets };
  }

  async save(data: WalletData): Promise<void> {
    // For MVP, we'll just upsert all data
    // In production, this should be more granular
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    // Upsert categories
    const cats = data.categories.map((c) => ({
      id: c.id,
      user_id: userId,
      name: c.name ?? null,
      built_in_key: c.builtInKey ?? null,
      type: c.type,
      icon: c.icon,
      color: c.color,
      is_system: !!c.builtInKey,
    }));
    await supabase.from('categories').upsert(cats);

    // Upsert transactions
    const txs = data.transactions.map((t) => ({
      id: t.id,
      user_id: userId,
      category_id: t.categoryId,
      type: t.type,
      amount: t.amount,
      transaction_date: t.transactionDate,
      note: t.note ?? null,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    }));
    await supabase.from('transactions').upsert(txs);

    // Upsert budgets
    const buds = data.budgets.map((b) => ({
      user_id: userId,
      category_id: b.categoryId,
      month_key: new Date().toISOString().slice(0, 7),
      limit_amount: b.limit,
    }));
    await supabase.from('budgets').upsert(buds);
  }
}