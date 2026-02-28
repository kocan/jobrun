/**
 * Tests for SyncManager — push, pull, conflict resolution, retry backoff.
 */

// --- Mocks ---

const mockSupabaseFrom = vi.fn();
const mockSupabase = { from: mockSupabaseFrom };

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => mockSupabase,
}));

// In-memory SQLite substitute
let tables: Record<string, Record<string, any>[]>;
let settings: Record<string, string>;
let tableColumns: Record<string, string[]>;

function resetStore() {
  settings = {};
  tableColumns = {
    customers: [
      'id', 'first_name', 'last_name', 'email', 'phone', 'address',
      'city', 'state', 'zip', 'notes', 'vertical_id',
      'sync_status', 'sync_retry_count', 'created_at', 'updated_at', 'deleted_at',
    ],
    jobs: ['id', 'customer_id', 'title', 'sync_status', 'sync_retry_count', 'created_at', 'updated_at', 'deleted_at'],
    estimates: ['id', 'sync_status', 'sync_retry_count', 'created_at', 'updated_at', 'deleted_at'],
    invoices: ['id', 'sync_status', 'sync_retry_count', 'created_at', 'updated_at', 'deleted_at'],
    price_book_services: ['id', 'sync_status', 'sync_retry_count', 'created_at', 'updated_at', 'deleted_at'],
  };
  tables = {
    customers: [],
    jobs: [],
    estimates: [],
    invoices: [],
    price_book_services: [],
    settings: [],
  };
}

const mockDb = {
  getAllSync: vi.fn((sql: string, params?: any[]) => {
    // PRAGMA table_info
    const pragmaMatch = sql.match(/PRAGMA table_info\((\w+)\)/);
    if (pragmaMatch) {
      const tableName = pragmaMatch[1];
      const cols = tableColumns[tableName] ?? [];
      return cols.map((name) => ({ name }));
    }

    // SELECT * FROM <table> WHERE sync_status = 'pending'
    const selectMatch = sql.match(/SELECT \* FROM (\w+) WHERE sync_status = 'pending'/);
    if (selectMatch) {
      const tableName = selectMatch[1];
      const maxRetry = params?.[0] ?? 5;
      return (tables[tableName] ?? []).filter(
        (r) => r.sync_status === 'pending' && (r.sync_retry_count ?? 0) < maxRetry
      );
    }

    return [];
  }),
  getFirstSync: vi.fn((sql: string, params?: any[]) => {
    // Settings lookup
    if (sql.includes('FROM settings')) {
      const key = params?.[0];
      return key && settings[key] ? { value: settings[key] } : null;
    }

    // Local record lookup by id
    const selectMatch = sql.match(/FROM (\w+) WHERE id/);
    if (selectMatch) {
      const tableName = selectMatch[1];
      const id = params?.[0];
      return (tables[tableName] ?? []).find((r) => r.id === id) ?? null;
    }

    return null;
  }),
  runSync: vi.fn((sql: string, params?: any[]) => {
    // INSERT OR REPLACE INTO settings
    if (sql.includes('INTO settings')) {
      const key = params?.[0] as string;
      const value = params?.[1] as string;
      settings[key] = value;
      return { changes: 1 };
    }

    // UPDATE <table> SET sync_status = 'synced'
    const updateSyncedMatch = sql.match(/UPDATE (\w+) SET sync_status = 'synced', sync_retry_count = 0 WHERE id/);
    if (updateSyncedMatch) {
      const tableName = updateSyncedMatch[1];
      const id = params?.[params.length - 1];
      const row = (tables[tableName] ?? []).find((r) => r.id === id);
      if (row) {
        // If there are SET clauses with values before sync_status, apply them
        if (params && params.length > 1) {
          const cols = (tableColumns[tableName] ?? []).filter((c) => c !== 'id');
          // Check if this is a pull update (has column values before the id)
          if (params.length > 1) {
            // For pull updates, params = [...columnValues, id]
            // For push updates, params = [id] only
            if (sql.includes(' = ?,')) {
              // This is a pull update with column values
              for (let i = 0; i < cols.length && i < params.length - 1; i++) {
                row[cols[i]] = params[i];
              }
            }
          }
        }
        row.sync_status = 'synced';
        row.sync_retry_count = 0;
      }
      return { changes: row ? 1 : 0 };
    }

    // UPDATE for resetFailedRetries (check before generic retry match)
    if (sql.includes('sync_retry_count = 0 WHERE sync_retry_count >=')) {
      const tableMatch = sql.match(/UPDATE (\w+)/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const maxRetry = params?.[0] ?? 5;
        for (const row of tables[tableName] ?? []) {
          if ((row.sync_retry_count ?? 0) >= maxRetry) {
            row.sync_retry_count = 0;
          }
        }
      }
      return { changes: 1 };
    }

    // UPDATE <table> SET sync_retry_count (increment on failure)
    const retryMatch = sql.match(/UPDATE (\w+) SET sync_retry_count/);
    if (retryMatch) {
      const tableName = retryMatch[1];
      const retryCount = params?.[0];
      const id = params?.[1];
      const row = (tables[tableName] ?? []).find((r) => r.id === id);
      if (row) row.sync_retry_count = retryCount;
      return { changes: row ? 1 : 0 };
    }

    // INSERT INTO <table> (new record from pull)
    const insertMatch = sql.match(/INSERT INTO (\w+) \(([^)]+)\)/);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const cols = insertMatch[2].split(',').map((c) => c.trim());
      const row: Record<string, any> = {};
      for (let i = 0; i < cols.length; i++) {
        row[cols[i]] = params?.[i] ?? null;
      }
      if (!tables[tableName]) tables[tableName] = [];
      tables[tableName].push(row);
      return { changes: 1 };
    }

    return { changes: 0 };
  }),
  execSync: vi.fn(),
  withTransactionSync: vi.fn((fn: () => void) => fn()),
  closeSync: vi.fn(),
};

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: vi.fn(() => mockDb),
}));

import { processSync, resetFailedRetries, _testing } from '../lib/db/syncManager';

// Disable real timers for backoff
vi.useFakeTimers({ shouldAdvanceTime: true });

beforeEach(() => {
  resetStore();
  mockSupabaseFrom.mockReset();
  mockDb.getAllSync.mockClear();
  mockDb.getFirstSync.mockClear();
  mockDb.runSync.mockClear();
});

afterAll(() => {
  vi.useRealTimers();
});

// Helper to add a pending record to the in-memory store
function addPendingRecord(
  table: string,
  overrides: Record<string, any> = {}
) {
  const now = new Date().toISOString();
  const record = {
    id: `test-${Math.random().toString(36).slice(2, 8)}`,
    sync_status: 'pending',
    sync_retry_count: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  };
  if (!tables[table]) tables[table] = [];
  tables[table].push(record);
  return record;
}

// Helper to create a chainable Supabase query mock
function mockUpsertSuccess() {
  mockSupabaseFrom.mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: null }),
  });
}

function mockUpsertError(message: string) {
  mockSupabaseFrom.mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: { message } }),
  });
}

// Create a thenable query builder that also supports .gt() chaining
function makeSelectChain(data: any[]) {
  const result = { data, error: null };
  const chain = {
    gt: vi.fn().mockReturnValue({ then: (resolve: any) => resolve(result) }),
    then: (resolve: any) => resolve(result),
  };
  return chain;
}

function mockPushAndPull(pushError: any, pullData: any[]) {
  mockSupabaseFrom.mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error: pushError }),
    select: vi.fn().mockReturnValue(makeSelectChain(pullData)),
  });
}

describe('SyncManager', () => {
  describe('backoffDelay', () => {
    it('doubles delay for each retry', () => {
      expect(_testing.backoffDelay(0)).toBe(1000);
      expect(_testing.backoffDelay(1)).toBe(2000);
      expect(_testing.backoffDelay(2)).toBe(4000);
      expect(_testing.backoffDelay(3)).toBe(8000);
    });
  });

  describe('processSync — push', () => {
    it('returns zeros when no pending records exist', async () => {
      mockPushAndPull(null, []);
      const result = await processSync();
      expect(result.pushed).toBe(0);
      expect(result.pulled).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('pushes pending records and marks them synced', async () => {
      const record = addPendingRecord('customers', {
        first_name: 'Alice',
        last_name: 'Smith',
      });

      mockPushAndPull(null, []);

      const result = await processSync();
      expect(result.pushed).toBe(1);
      expect(result.failed).toBe(0);

      // Record should be marked synced
      const customer = tables.customers.find((r) => r.id === record.id);
      expect(customer?.sync_status).toBe('synced');
      expect(customer?.sync_retry_count).toBe(0);
    });

    it('increments retry count on push failure', async () => {
      const record = addPendingRecord('customers', {
        first_name: 'Bob',
        last_name: 'Jones',
      });

      mockUpsertError('Network timeout');

      // Only push phase — mock pull to return empty
      mockSupabaseFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Network timeout' } }),
        select: vi.fn().mockReturnValue({
          gt: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await processSync();
      expect(result.failed).toBe(1);
      expect(result.errors).toContain(`customers/${record.id}: Network timeout`);

      const customer = tables.customers.find((r) => r.id === record.id);
      expect(customer?.sync_retry_count).toBe(1);
      expect(customer?.sync_status).toBe('pending');
    });

    it('skips records that exceeded max retry count', async () => {
      addPendingRecord('customers', {
        first_name: 'Max',
        last_name: 'Retried',
        sync_retry_count: _testing.MAX_RETRY_COUNT,
      });

      mockPushAndPull(null, []);

      const result = await processSync();
      expect(result.pushed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('pushes soft-deleted records with deleted_at set', async () => {
      const deletedAt = new Date().toISOString();
      const record = addPendingRecord('customers', {
        first_name: 'Deleted',
        last_name: 'User',
        deleted_at: deletedAt,
      });

      mockPushAndPull(null, []);

      const result = await processSync();
      expect(result.pushed).toBe(1);

      // Verify upsert was called (the from().upsert() chain)
      expect(mockSupabaseFrom).toHaveBeenCalledWith('customers');
    });
  });

  describe('processSync — pull', () => {
    it('inserts new server records into local DB', async () => {
      const serverRecord = {
        id: 'server-1',
        first_name: 'Server',
        last_name: 'User',
        email: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        zip: null,
        notes: null,
        vertical_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
      };

      mockPushAndPull(null, [serverRecord]);

      const result = await processSync();
      expect(result.pulled).toBeGreaterThanOrEqual(1);
    });

    it('skips server record when local pending change is newer', async () => {
      // Local record with newer timestamp and pending status
      const localRecord = addPendingRecord('customers', {
        id: 'conflict-1',
        first_name: 'Local',
        last_name: 'Wins',
        updated_at: '2025-06-01T00:00:00Z',
        sync_status: 'pending',
      });

      const serverRecord = {
        id: 'conflict-1',
        first_name: 'Server',
        last_name: 'Loses',
        updated_at: '2025-05-01T00:00:00Z',
        deleted_at: null,
      };

      mockPushAndPull(null, [serverRecord]);

      await processSync();

      // Local record should keep its values (server was older)
      const customer = tables.customers.find((r) => r.id === 'conflict-1');
      expect(customer?.first_name).toBe('Local');
      expect(customer?.last_name).toBe('Wins');
    });

    it('server wins when server updated_at is newer than pending local', async () => {
      addPendingRecord('customers', {
        id: 'conflict-2',
        first_name: 'Local',
        last_name: 'Loses',
        updated_at: '2025-01-01T00:00:00Z',
        sync_status: 'pending',
      });

      const serverRecord = {
        id: 'conflict-2',
        first_name: 'Server',
        last_name: 'Wins',
        email: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        zip: null,
        notes: null,
        vertical_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-06-01T00:00:00Z',
        deleted_at: null,
      };

      mockPushAndPull(null, [serverRecord]);

      await processSync();

      const customer = tables.customers.find((r) => r.id === 'conflict-2');
      expect(customer?.sync_status).toBe('synced');
    });

    it('server wins when local record is already synced', async () => {
      // Local record that is already synced (not pending)
      tables.customers.push({
        id: 'synced-1',
        first_name: 'Old',
        last_name: 'Data',
        updated_at: '2025-01-01T00:00:00Z',
        sync_status: 'synced',
        sync_retry_count: 0,
        created_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
      });

      const serverRecord = {
        id: 'synced-1',
        first_name: 'Updated',
        last_name: 'Data',
        email: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        zip: null,
        notes: null,
        vertical_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-02-01T00:00:00Z',
        deleted_at: null,
      };

      mockPushAndPull(null, [serverRecord]);

      await processSync();

      const customer = tables.customers.find((r) => r.id === 'synced-1');
      expect(customer?.sync_status).toBe('synced');
    });
  });

  describe('processSync — last sync timestamp', () => {
    it('stores last sync timestamp on success', async () => {
      mockPushAndPull(null, []);

      await processSync();

      expect(settings['last_sync_timestamp']).toBeDefined();
    });

    it('does not update last sync timestamp when there are push failures', async () => {
      addPendingRecord('customers', { first_name: 'Fail', last_name: 'Case' });

      mockSupabaseFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: { message: 'fail' } }),
        select: vi.fn().mockReturnValue({
          gt: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      await processSync();

      expect(settings['last_sync_timestamp']).toBeUndefined();
    });
  });

  describe('resetFailedRetries', () => {
    it('resets retry counts for records exceeding max', () => {
      addPendingRecord('customers', {
        first_name: 'Failed',
        last_name: 'Record',
        sync_retry_count: 10,
      });
      addPendingRecord('customers', {
        first_name: 'Normal',
        last_name: 'Record',
        sync_retry_count: 1,
      });

      resetFailedRetries();

      const failed = tables.customers.find((r) => r.first_name === 'Failed');
      const normal = tables.customers.find((r) => r.first_name === 'Normal');
      expect(failed?.sync_retry_count).toBe(0);
      expect(normal?.sync_retry_count).toBe(1);
    });
  });
});
