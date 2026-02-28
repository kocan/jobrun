import { getDatabase } from './database';
import { getSupabase, isSupabaseConfigured } from '../supabase';
import { SyncableTable } from './syncQueue';

const SYNCABLE_TABLES: SyncableTable[] = [
  'customers',
  'jobs',
  'estimates',
  'invoices',
  'price_book_services',
];

const MAX_RETRY_COUNT = 5;
const BASE_BACKOFF_MS = 1000;
const LAST_SYNC_KEY = 'last_sync_timestamp';

interface SyncResult {
  pushed: number;
  pulled: number;
  failed: number;
  errors: string[];
}

interface PendingRecord {
  id: string;
  sync_retry_count: number;
  updated_at: string;
  deleted_at: string | null;
  [key: string]: unknown;
}

type SQLValue = string | number | null;

interface ServerRecord {
  id: string;
  updated_at: string;
  deleted_at: string | null;
  [key: string]: SQLValue;
}

/**
 * Get the last sync timestamp from settings, or null if never synced.
 */
function getLastSyncTimestamp(): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    [LAST_SYNC_KEY]
  );
  return row?.value ?? null;
}

/**
 * Store the last sync timestamp.
 */
function setLastSyncTimestamp(timestamp: string): void {
  const db = getDatabase();
  db.runSync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [LAST_SYNC_KEY, timestamp]
  );
}

/**
 * Calculate exponential backoff delay for a given retry count.
 */
function backoffDelay(retryCount: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, retryCount);
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get all columns for a table (excluding internal-only fields).
 * Returns column names from the table schema.
 */
function getTableColumns(table: SyncableTable): string[] {
  const db = getDatabase();
  const rows = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows
    .map((r) => r.name)
    .filter((name) => name !== 'sync_status' && name !== 'sync_retry_count');
}

/**
 * Push pending local records to Supabase.
 */
async function pushRecords(table: SyncableTable): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getSupabase();
  if (!supabase) return { synced: 0, failed: 0, errors: [] };

  const db = getDatabase();
  const pending = db.getAllSync<PendingRecord>(
    `SELECT * FROM ${table} WHERE sync_status = 'pending' AND (sync_retry_count < ? OR sync_retry_count IS NULL)`,
    [MAX_RETRY_COUNT]
  );

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const columns = getTableColumns(table);

  for (const record of pending) {
    const retryCount = record.sync_retry_count ?? 0;

    // Apply backoff delay for retries
    if (retryCount > 0) {
      await sleep(backoffDelay(retryCount));
    }

    // Build the payload with only table columns (no sync_status/sync_retry_count)
    const payload: Record<string, unknown> = {};
    for (const col of columns) {
      if (col in record) {
        payload[col] = record[col];
      }
    }

    const { error } = await supabase.from(table).upsert(payload, {
      onConflict: 'id',
    });

    if (error) {
      failed++;
      errors.push(`${table}/${record.id}: ${error.message}`);
      // Increment retry count
      db.runSync(
        `UPDATE ${table} SET sync_retry_count = ? WHERE id = ?`,
        [retryCount + 1, record.id]
      );
    } else {
      synced++;
      db.runSync(
        `UPDATE ${table} SET sync_status = 'synced', sync_retry_count = 0 WHERE id = ?`,
        [record.id]
      );
    }
  }

  return { synced, failed, errors };
}

/**
 * Pull server changes since the last sync timestamp and merge into local DB.
 * Uses last-write-wins conflict resolution based on updated_at.
 */
async function pullRecords(
  table: SyncableTable,
  since: string | null
): Promise<{ pulled: number; errors: string[] }> {
  const supabase = getSupabase();
  if (!supabase) return { pulled: 0, errors: [] };

  let query = supabase.from(table).select('*');
  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data, error } = await query;
  if (error) {
    return { pulled: 0, errors: [`${table} pull: ${error.message}`] };
  }
  if (!data || data.length === 0) {
    return { pulled: 0, errors: [] };
  }

  const db = getDatabase();
  const columns = getTableColumns(table);
  let pulled = 0;
  const errors: string[] = [];

  for (const serverRow of data as ServerRecord[]) {
    try {
      // Check local record for conflict resolution
      const localRow = db.getFirstSync<{ updated_at: string; sync_status: string }>(
        `SELECT updated_at, sync_status FROM ${table} WHERE id = ?`,
        [serverRow.id]
      );

      if (localRow) {
        // Conflict resolution: last-write-wins using updated_at
        // If local has pending changes with a newer timestamp, skip server update
        if (
          localRow.sync_status === 'pending' &&
          localRow.updated_at > serverRow.updated_at
        ) {
          continue;
        }

        // Server wins — update local record
        const setClauses = columns
          .filter((col) => col !== 'id')
          .map((col) => `${col} = ?`);
        const values = columns
          .filter((col) => col !== 'id')
          .map((col) => serverRow[col] ?? null);

        db.runSync(
          `UPDATE ${table} SET ${setClauses.join(', ')}, sync_status = 'synced', sync_retry_count = 0 WHERE id = ?`,
          [...values, serverRow.id]
        );
      } else {
        // New record from server — insert locally
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((col) => serverRow[col] ?? null);

        db.runSync(
          `INSERT INTO ${table} (${columns.join(', ')}, sync_status, sync_retry_count) VALUES (${placeholders}, 'synced', 0)`,
          values
        );
      }
      pulled++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${table}/${serverRow.id} merge: ${msg}`);
    }
  }

  return { pulled, errors };
}

/**
 * Process the full sync queue: push local changes, then pull server changes.
 * Returns a summary of what was synced.
 */
export async function processSync(): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return { pushed: 0, pulled: 0, failed: 0, errors: ['Supabase not configured'] };
  }

  const result: SyncResult = { pushed: 0, pulled: 0, failed: 0, errors: [] };
  const syncStartTime = new Date().toISOString();
  const lastSync = getLastSyncTimestamp();

  // Phase 1: Push all pending local changes
  for (const table of SYNCABLE_TABLES) {
    const pushResult = await pushRecords(table);
    result.pushed += pushResult.synced;
    result.failed += pushResult.failed;
    result.errors.push(...pushResult.errors);
  }

  // Phase 2: Pull server changes since last sync
  for (const table of SYNCABLE_TABLES) {
    const pullResult = await pullRecords(table, lastSync);
    result.pulled += pullResult.pulled;
    result.errors.push(...pullResult.errors);
  }

  // Update last sync timestamp only if we had no push failures
  if (result.failed === 0) {
    setLastSyncTimestamp(syncStartTime);
  }

  return result;
}

/**
 * Reset retry counts for all records that have exceeded the max retry limit.
 * Useful for manual "retry all" triggered by the user.
 */
export function resetFailedRetries(): void {
  const db = getDatabase();
  for (const table of SYNCABLE_TABLES) {
    db.runSync(
      `UPDATE ${table} SET sync_retry_count = 0 WHERE sync_retry_count >= ?`,
      [MAX_RETRY_COUNT]
    );
  }
}

export const _testing = {
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  backoffDelay,
  pushRecords,
  pullRecords,
  MAX_RETRY_COUNT,
  SYNCABLE_TABLES,
};
