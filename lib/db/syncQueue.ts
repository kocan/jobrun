import { getDatabase } from './database';

export type SyncableTable = 'customers' | 'jobs' | 'estimates' | 'invoices' | 'price_book_services';

const SYNCABLE_TABLES: SyncableTable[] = ['customers', 'jobs', 'estimates', 'invoices', 'price_book_services'];

export function getPendingSyncCount(): number {
  const db = getDatabase();
  let total = 0;
  for (const table of SYNCABLE_TABLES) {
    const row = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM ${table} WHERE sync_status = 'pending'`);
    total += row?.count ?? 0;
  }
  return total;
}

export function getPendingSyncCountByTable(): Record<SyncableTable, number> {
  const db = getDatabase();
  const result = {} as Record<SyncableTable, number>;
  for (const table of SYNCABLE_TABLES) {
    const row = db.getFirstSync<{ count: number }>(`SELECT COUNT(*) as count FROM ${table} WHERE sync_status = 'pending'`);
    result[table] = row?.count ?? 0;
  }
  return result;
}

export function markAsSynced(table: SyncableTable, id: string): void {
  const db = getDatabase();
  db.runSync(`UPDATE ${table} SET sync_status = 'synced' WHERE id = ?`, [id]);
}

export function markAllAsSynced(table: SyncableTable): void {
  const db = getDatabase();
  db.runSync(`UPDATE ${table} SET sync_status = 'synced' WHERE sync_status = 'pending'`);
}

/**
 * Placeholder for future Supabase sync.
 * When online, this would process all pending records and push them to the server.
 */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  // TODO: Implement actual Supabase sync
  // For now, just return counts
  const pending = getPendingSyncCount();
  return { synced: 0, failed: pending };
}
