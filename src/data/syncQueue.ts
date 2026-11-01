import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';

const SYNC_STORAGE_KEY = 'viminh_sync_queue';
const DEVICE_ID_KEY = 'viminh_device_id';

/**
 * Get or create a unique device identifier for this app installation.
 * This helps track which device made changes for sync deduplication.
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (deviceId) return deviceId;

    // Create new device ID
    let base = 'unknown';
    try {
      if (Platform.OS === 'android') {
        base = Application.getAndroidId() ?? 'unknown';
      } else if (Platform.OS === 'ios') {
        base = await Application.getIosIdForVendorAsync() ?? 'unknown';
      }
    } catch {
      // Ignore
    }
    const random = Math.random().toString(36).slice(2, 10);
    deviceId = `${Platform.OS}-${base}-${random}`.slice(0, 100);
    
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch {
    // Fallback
    return `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export interface SyncOperation {
  id: string;
  table: 'transactions' | 'budgets' | 'categories' | 'wallets';
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  createdAt: string;
  retryCount: number;
  deviceId: string;  // Track which device made this change
}

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
    const deviceId = await getDeviceId();
    const operationEntry: SyncOperation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      table,
      recordId,
      operation,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      deviceId,
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

  /** Get all operations from a specific device */
  async getByDevice(deviceId: string): Promise<SyncOperation[]> {
    const queue = await this.getQueue();
    return queue.filter((op) => op.deviceId === deviceId);
  }
}

export const syncQueue = new SyncQueue();