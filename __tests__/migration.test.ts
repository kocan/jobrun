/**
 * Tests for AsyncStorage → SQLite migration
 */

const mockDb = {
  execSync: vi.fn(),
  runSync: vi.fn(() => ({ changes: 1 })),
  getFirstSync: vi.fn((sql: string) => {
    if (sql.includes('schema_version')) return { value: '1' };
    return null;
  }),
  getAllSync: vi.fn(() => []),
  withTransactionSync: vi.fn((fn: () => void) => fn()),
  closeSync: vi.fn(),
};

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: vi.fn(() => mockDb),
}));

let asyncStore: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  getItem: vi.fn((key: string) => Promise.resolve(asyncStore[key] || null)),
  setItem: vi.fn((key: string, value: string) => {
    asyncStore[key] = value;
    return Promise.resolve();
  }),
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(asyncStore[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      asyncStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn(),
    multiGet: vi.fn(),
    multiRemove: vi.fn(),
    getAllKeys: vi.fn(),
  },
}));

import { migrateFromAsyncStorage } from '../lib/db/migration';
import { _resetDb } from '../lib/db/database';

beforeEach(() => {
  _resetDb();
  asyncStore = {};
  mockDb.runSync.mockClear();
  mockDb.withTransactionSync.mockClear();
});

describe('AsyncStorage migration', () => {
  it('skips if already migrated', async () => {
    asyncStore['@jobrun_sqlite_migrated'] = 'true';
    const result = await migrateFromAsyncStorage();
    expect(result).toBe(false);
    expect(mockDb.runSync).not.toHaveBeenCalled();
  });

  it('migrates customers from AsyncStorage', async () => {
    asyncStore['@jobrun_customers'] = JSON.stringify([
      { id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'a@b.com', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ]);
    const result = await migrateFromAsyncStorage();
    expect(result).toBe(true);
    expect(mockDb.withTransactionSync).toHaveBeenCalled();
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO customers'),
      expect.arrayContaining(['c1', 'Alice', 'Smith'])
    );
    // Should mark as done
    expect(asyncStore['@jobrun_sqlite_migrated']).toBe('true');
  });

  it('migrates jobs with line items', async () => {
    asyncStore['@jobrun_jobs'] = JSON.stringify([
      {
        id: 'j1', customerId: 'c1', title: 'Job 1', status: 'scheduled',
        scheduledDate: '2024-06-15', total: 100, photos: [],
        lineItems: [{ id: 'li1', name: 'Service A', quantity: 1, unitPrice: 100, total: 100 }],
        createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
      },
    ]);
    await migrateFromAsyncStorage();
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO jobs'),
      expect.arrayContaining(['j1'])
    );
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO job_line_items'),
      expect.arrayContaining(['li1', 'j1'])
    );
  });

  it('migrates settings', async () => {
    asyncStore['@jobrun_settings'] = JSON.stringify({
      businessName: 'Test Biz', onboardingComplete: true,
    });
    await migrateFromAsyncStorage();
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO settings'),
      ['app_businessName', 'Test Biz']
    );
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO settings'),
      ['app_onboardingComplete', 'true']
    );
  });

  it('migrates invoice counter', async () => {
    asyncStore['@jobrun_invoice_counter'] = '5';
    await migrateFromAsyncStorage();
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE invoice_counter'),
      [6]
    );
  });
});
