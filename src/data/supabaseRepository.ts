import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import type { WalletData, Category, Transaction, Budget } from '@/domain/types';
import type { WalletRepository } from './WalletRepository';

const LOCAL_DATA_KEY = 'viminh_local_wallet_data';

export class SupabaseRepository implements WalletRepository {
  async load(): Promise<WalletData> {
    // Try Supabase first
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error('Not authenticated');

      const [txRes, catRes, budRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('budgets').select('*').eq('user_id', userId),
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

      const data: WalletData = { version: 1, transactions, categories, budgets };

      // Cache locally for offline use
      await AsyncStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));

      return data;
    } catch (supabaseError) {
      // Fall back to local cache
      try {
        const raw = await AsyncStorage.getItem(LOCAL_DATA_KEY);
        if (raw) {
          const data = JSON.parse(raw) as WalletData;
          return data;
        }
      } catch {
        // Ignore local cache errors
      }
      throw supabaseError;
    }
  }

  async save(data: WalletData): Promise<void> {
    // Try Supabase first
    try {
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
      const { error: catError } = await supabase.from('categories').upsert(cats);
      if (catError) throw catError;

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
      const { error: txError } = await supabase.from('transactions').upsert(txs);
      if (txError) throw txError;

      // Upsert budgets
      const buds = data.budgets.map((b) => ({
        user_id: userId,
        category_id: b.categoryId,
        month_key: new Date().toISOString().slice(0, 7),
        limit_amount: b.limit,
      }));
      const { error: budError } = await supabase.from('budgets').upsert(buds);
      if (budError) throw budError;

      // Cache locally
      await AsyncStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
    } catch (supabaseError) {
      // Fall back to local storage only
      try {
        await AsyncStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
      } catch {
        // Ignore local storage errors
      }
      throw supabaseError;
    }
  }
}