import { supabase } from '@/data/supabaseClient';
import { syncQueue } from '@/data/syncQueue';
import type { SyncOperation } from '@/data/syncQueue';
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
    }
  }

  private async syncTransaction(op: SyncOperation, userId: string): Promise<void> {
    const { table } = op;

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
        transaction_date: input.transactionDate,
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
          transaction_date: input.transactionDate,
          note: input.note ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', op.recordId);
      if (error) throw error;
    } else if (op.operation === 'DELETE') {
      const { error } = await supabase.from('transactions').delete().eq('id', op.recordId);
      if (error) throw error;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _table = op.table;
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
}

export const syncService = new SyncService();