import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { create } from 'zustand';

import {
  deleteStoredFiles,
  JsonFileRepository,
  readLegacyData,
  retireLegacyData,
  userFileName,
} from '@/data/jsonFileRepository';
import { FileOutbox, userOutboxName } from '@/data/outbox';
import { supabase } from '@/data/supabaseClient';
import { createSupabaseRemote } from '@/data/supabaseRemote';
import type { WalletData } from '@/domain/types';
import { createSyncEngine, type SyncEngine, type SyncSnapshot } from '@/services/syncEngine';

import { useAppLock } from './appLock';
import { useAuth, type AuthErrorCode } from './auth';
import { setCommitListener, walletStore } from './wallet';

/**
 * Ties the signed-in user to their data: opens that user's wallet file, routes committed changes to
 * their outbox, and syncs on sign-in, after local changes, and when the app returns to the foreground.
 */
export const useSync = create<SyncSnapshot>()(() => ({ status: 'idle', pending: 0, lastSyncedAt: null, error: null }));

/** Data from before accounts existed, waiting for the user to decide whether to import it. */
export const useLegacyImport = create<{ data: WalletData | null }>()(() => ({ data: null }));

const PUSH_DELAY_MS = 1500;
const cursorKey = (userId: string) => `sync-cursor:${userId}`;

let engine: SyncEngine | null = null;
let currentUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    engine?.sync();
  }, PUSH_DELAY_MS);
}

async function openUser(userId: string) {
  currentUserId = userId;
  const outbox = new FileOutbox(userOutboxName(userId));
  const key = cursorKey(userId);
  const thisEngine = createSyncEngine({
    remote: createSupabaseRemote(supabase, userId),
    outbox,
    cursor: {
      get: () => AsyncStorage.getItem(key),
      set: (value) => AsyncStorage.setItem(key, value),
    },
    target: {
      getData: () => walletStore.getState().data,
      applyRemote: (changes, pending) => walletStore.getState().applyRemote(changes, pending),
    },
    onChange: (snapshot) => {
      if (engine === thisEngine) useSync.setState(snapshot);
    },
  });
  engine = thisEngine;

  setCommitListener(async (ops) => {
    if (engine !== thisEngine) return;
    await thisEngine.enqueue(ops);
    schedulePush();
  });

  await walletStore.getState().open(new JsonFileRepository(userFileName(userId)));
  if (currentUserId !== userId) return;

  await thisEngine.refreshPending();
  if (walletStore.getState().status === 'ready') {
    useLegacyImport.setState({ data: await readLegacyData() });
    void thisEngine.sync();
  }
}

function closeUser() {
  currentUserId = null;
  engine = null;
  if (pushTimer) clearTimeout(pushTimer);
  setCommitListener(undefined);
  walletStore.getState().close();
  useSync.setState({ status: 'idle', pending: 0, lastSyncedAt: null, error: null });
  useLegacyImport.setState({ data: null });
}

let started = false;

/** Call once at startup. Reacts to sign-in/out for the lifetime of the app. */
export function startSession() {
  if (started) return;
  started = true;

  useAuth.subscribe((state, previous) => {
    const id = state.user?.id ?? null;
    if (id === (previous.user?.id ?? null)) return;
    closeUser();
    if (id) void openUser(id);
  });
  const initial = useAuth.getState().user?.id;
  if (initial) void openUser(initial);

  AppState.addEventListener('change', (state) => {
    if (state === 'active') void engine?.sync();
  });
}

/** Manual retry, e.g. from the sync status chip. */
export function syncNow(): Promise<void> {
  return engine?.sync() ?? Promise.resolve();
}

/**
 * Tries to push pending changes before signing out. Returns the number still unsynced so the UI can
 * warn; call `useAuth.getState().signOut()` to proceed.
 */
export async function flushBeforeSignOut(): Promise<number> {
  if (!engine) return 0;
  await engine.sync();
  return engine.snapshot.pending;
}

/** Imports the pre-account data into the signed-in user's wallet, replacing what's there. */
export async function importLegacyData(): Promise<void> {
  const data = useLegacyImport.getState().data;
  if (!data) return;
  await walletStore.getState().replaceAll(data);
  retireLegacyData();
  useLegacyImport.setState({ data: null });
}

export function dismissLegacyImport(): void {
  retireLegacyData();
  useLegacyImport.setState({ data: null });
}

/**
 * Permanently deletes the signed-in account: re-checks the password, deletes the account and its
 * synced data on the server, signs out, then removes this user's files and the app lock from the device.
 */
export async function deleteAccount(password: string): Promise<AuthErrorCode | null> {
  const auth = useAuth.getState();
  const userId = auth.user?.id;
  if (!userId) return 'unknown';
  const check = await auth.verifyPassword(password);
  if (check) return check;
  const failure = await auth.deleteRemoteAccount();
  if (failure) return failure;

  await auth.signOut(); // closes the wallet store and sync engine for this user
  deleteStoredFiles([userFileName(userId), userOutboxName(userId)]);
  await AsyncStorage.removeItem(cursorKey(userId)).catch(() => undefined);
  await useAppLock.getState().removePin().catch(() => undefined);
  return null;
}
