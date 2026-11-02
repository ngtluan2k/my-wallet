import type { SupabaseClient } from '@supabase/supabase-js';

import type { SyncTable } from '@/domain/sync';
import type { RemoteApi } from '@/services/syncEngine';

import { KEY_COLUMN, type Row } from './syncRows';

const PAGE = 1000;

/** RemoteApi over the v2 sync tables. Row-level security limits every call to the signed-in user. */
export function createSupabaseRemote(client: SupabaseClient, userId: string): RemoteApi {
  return {
    async upsert(table, rows) {
      const { error } = await client
        .from(table)
        .upsert(
          rows.map((r) => ({ ...r, user_id: userId })),
          { onConflict: `user_id,${KEY_COLUMN[table]}` },
        );
      if (error) throw error;
    },

    async softDelete(table, ids) {
      const { error } = await client
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in(KEY_COLUMN[table], ids);
      if (error) throw error;
    },

    async pull(table: SyncTable, since) {
      const rows: Row[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = client
          .from(table)
          .select('*')
          .eq('user_id', userId)
          .order('server_updated_at', { ascending: true })
          .order(KEY_COLUMN[table], { ascending: true })
          .range(from, from + PAGE - 1);
        if (since) query = query.gte('server_updated_at', since);
        const { data, error } = await query;
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      return rows;
    },
  };
}
