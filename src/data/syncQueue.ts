import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_STORAGE_KEY = 'viminh_sync_queue';

export interface SyncOperation {
  id: string;
  table: 'transactions' | 'budgets';
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  createdAt: string;
  retryCount: number;
}

const SYNC_STORAGE_KEY = 'viminh_sync_queue';

export class SyncQueue {
  private async getQueue(): Promise<SyncOperation[]> {
    try {
      const raw = await AsyncStorage.getItem(SYNC_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SyncOperation[];
    } catch {
      return [];
    }
  }

  private async saveQueue(queue: SyncOperation[]): Promise<void> {
    await AsyncStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(queue));
  }

  async enqueue(
    table: SyncOperation['table'],
    recordId: string,
    operation: SyncOperation['operation'],
    payload: any,
  ): Promise<void> {
    const queue = await this.getQueue();
    const operationEntry: SyncOperation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      table,
      recordId,
      operation,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(operationEntry);
    await this.saveQueue(queue);
  }

  async getPending(): Promise<SyncOperation[]> {
    const queue = await this.getQueue();
    return queue.filter((op) => op.retryCount < 3);
  }

  async markSynced(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((op) => op.id !== id);
    await this.saveQueue(filtered);
  }

  async incrementRetry(id: string): Promise<void> {
    const queue = await this.getQueue();
    const updated = queue.map((op) => (op.id === id ? { ...op, retryCount: op.retryCount + 1 } : op));
    await this.saveQueue(updated);
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_STORAGE_KEY);
  }
}

export const syncQueue = new SyncQueue();