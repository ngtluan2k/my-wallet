import { supabase } from '@/data/supabaseClient';
import { syncQueue, type SyncOperation } from '@/data/syncQueue';
import type { TransactionInput } from '@/domain/transactions';
import type { Budget } from '@/domain/types';

export class SyncService {
  private syncing = false;

  async syncPendingOperations(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const pending = await syncQueue.getPending();

      for (const op of pending) {
        try {
          await this.executeSyncOperation(op);
          await syncQueue.markSynced(op.id);
        } catch (error) {
          await syncQueue.incrementRetry(op.id);
          console.error(`Sync failed for operation ${op.id}:`, error);
        }
      }
    } finally {
      this.syncing = false;
    }
  }

  private async executeSyncOperation(op: SyncOperation): Promise<void> {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) throw new Error('Not authenticated');

    if (op.table === 'transactions') {
      await this.syncTransaction(op, userId);
    } else if (op.table === 'budgets') {
      await this.syncBudget(op, userId);
    } else if (op.table === 'categories') {
      await this.syncCategory(op, userId);
    } else if (op.table === 'wallets') {
      await this.syncWallet(op, userId);
    }
  }

  private async syncTransaction(op: SyncOperation, userId: string): Promise<void> {
    if (op.operation === 'INSERT') {
      const input: TransactionInput = {
        type: op.payload.type,
        amount: op.payload.amount,
        categoryId: op.payload.categoryId,
        transactionDate: op.payload.transactionDate,
        note: op.payload.note,
      };
      const { error } = await supabase.from('transactions').insert({
        id: op.recordId,
        user_id: userId,
        category_id: input.categoryId,
        type: input.type,
        amount: input.amount,
        transaction_date: op.payload.transactionDate,
        note: input.note ?? null,
        created_at: op.payload.createdAt,
        updated_at: op.payload.updatedAt,
      });
      if (error) throw error;
    } else if (op.operation === 'UPDATE') {
      const input: TransactionInput = op.payload;
      const { error } = await supabase
        .from('transactions')
        .update({
          category_id: input.categoryId,
          type: input.type,
          amount: input.amount,
          transaction_date: op.payload.transactionDate,
          note: input.note ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', op.recordId);
      if (error) throw error;
    } else if (op.operation === 'DELETE') {
      const { error } = await supabase.from('transactions').delete().eq('id', op.recordId);
      if (error) throw error;
    }
  }

  private async syncBudget(op: SyncOperation, userId: string): Promise<void> {
    if (op.operation === 'INSERT') {
      const { error } = await supabase.from('budgets').insert({
        id: op.recordId,
        user_id: userId,
        category_id: op.payload.categoryId,
        month_key: op.payload.monthKey,
        limit_amount: op.payload.limit,
      });
      if (error) throw error;
    } else if (op.operation === 'UPDATE') {
      const { error } = await supabase
        .from('budgets')
        .update({
          category_id: op.payload.categoryId,
          month_key: op.payload.monthKey,
          limit_amount: op.payload.limit,
        })
        .eq('id', op.recordId);
      if (error) throw error;
    } else if (op.operation === 'DELETE') {
      const { error } = await supabase.from('budgets').delete().eq('id', op.recordId);
      if (error) throw error;
    }
  }

  private async syncCategory(op: SyncOperation, userId: string): Promise<void> {
    if (op.operation === 'INSERT') {
      const { error } = await supabase.from('categories').insert({
        id: op.recordId,
        user_id: userId,
        name: op.payload.name ?? null,
        built_in_key: op.payload.builtInKey ?? null,
        type: op.payload.type,
        icon: op.payload.icon,
        color: op.payload.color,
        is_system: false,
      });
      if (error) throw error;
    } else if (op.operation === 'UPDATE') {
      const { error } = await supabase
        .from('categories')
        .update({
          name: op.payload.name ?? null,
          type: op.payload.type,
          icon: op.payload.icon,
          color: op.payload.color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', op.recordId);
      if (error) throw error;
    } else if (op.operation === 'DELETE') {
      const { error } = await supabase.from('categories').delete().eq('id', op.recordId);
      if (error) throw error;
    }
  }

  private async syncWallet(op: SyncOperation, userId: string): Promise<void> {
    if (op.operation === 'INSERT') {
      const { error } = await supabase.from('wallets').insert({
        id: op.recordId,
        user_id: userId,
        name: op.payload.name,
        opening_balance: op.payload.openingBalance ?? 0,
        currency: op.payload.currency ?? 'VND',
        is_default: op.payload.isDefault ?? false,
      });
      if (error) throw error;
    } else if (op.operation === 'UPDATE') {
      const { error } = await supabase
        .from('wallets')
        .update({
          name: op.payload.name,
          opening_balance: op.payload.openingBalance ?? 0,
          currency: op.payload.currency ?? 'VND',
          is_default: op.payload.isDefault ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', op.recordId);
      if (error) throw error;
    } else if (op.operation === 'DELETE') {
      const { error } = await supabase.from('wallets').delete().eq('id', op.recordId);
      if (error) throw error;
    }
  }

  async enqueueTransaction(
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: TransactionInput & { createdAt?: string; updatedAt?: string },
  ): Promise<void> {
    await syncQueue.enqueue('transactions', recordId, operation, payload);
  }

  async enqueueBudget(
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: Budget & { monthKey: string },
  ): Promise<void> {
    await syncQueue.enqueue('budgets', recordId, operation, payload);
  }

  async enqueueCategory(
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: { name?: string; builtInKey?: string; type: 'income' | 'expense'; icon: string; color: string },
  ): Promise<void> {
    await syncQueue.enqueue('categories', recordId, operation, payload);
  }

  async enqueueWallet(
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: { name: string; openingBalance?: number; currency?: string; isDefault?: boolean },
  ): Promise<void> {
    await syncQueue.enqueue('wallets', recordId, operation, payload);
  }
}

export const syncService = new SyncService();