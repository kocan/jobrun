/**
 * Tests for SQLite database layer.
 * We mock expo-sqlite to use an in-memory approach with a simple object store.
 */

// Mock expo-sqlite with a minimal synchronous implementation
const mockStore: Record<string, any[]> = {};
let mockSettings: Record<string, string> = {};
let mockInvoiceCounter = 1;

const mockDb = {
  execSync: jest.fn(),
  runSync: jest.fn((sql: string, params?: any[]) => {
    // Track for assertions
    return { changes: 1 };
  }),
  getFirstSync: jest.fn((sql: string, params?: any[]) => {
    if (sql.includes('schema_version')) {
      return mockSettings['schema_version'] ? { value: mockSettings['schema_version'] } : null;
    }
    if (sql.includes('invoice_counter')) {
      return { next_number: mockInvoiceCounter };
    }
    return null;
  }),
  getAllSync: jest.fn((sql: string, params?: any[]) => {
    return [];
  }),
  withTransactionSync: jest.fn((fn: () => void) => fn()),
  closeSync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDb),
}));

import { initializeDatabase, getDatabase, closeDatabase, _resetDb } from '../lib/db/database';
import { SCHEMA_VERSION } from '../lib/db/schema';

beforeEach(() => {
  _resetDb();
  mockDb.execSync.mockClear();
  mockDb.runSync.mockClear();
  mockDb.getFirstSync.mockClear();
  mockDb.getAllSync.mockClear();
  mockDb.withTransactionSync.mockClear();
  mockSettings = {};
  mockInvoiceCounter = 1;
});

describe('Database initialization', () => {
  it('creates database and runs migrations on first init', () => {
    initializeDatabase();
    // Should set WAL mode and foreign keys
    expect(mockDb.execSync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL;');
    expect(mockDb.execSync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
    // Should run migration in transaction
    expect(mockDb.withTransactionSync).toHaveBeenCalled();
    // Should store schema version
    const schemaCalls = mockDb.runSync.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('schema_version')
    );
    expect(schemaCalls.length).toBeGreaterThan(0);
  });

  it('skips migration if already at current version', () => {
    mockSettings['schema_version'] = String(SCHEMA_VERSION);
    mockDb.getFirstSync.mockImplementation((sql: string) => {
      if (sql.includes('schema_version')) return { value: String(SCHEMA_VERSION) };
      return null;
    });
    initializeDatabase();
    // Transaction should not be called for migration
    expect(mockDb.withTransactionSync).not.toHaveBeenCalled();
  });

  it('getDatabase returns same instance', () => {
    const db1 = getDatabase();
    const db2 = getDatabase();
    expect(db1).toBe(db2);
  });

  it('closeDatabase clears instance', () => {
    getDatabase();
    closeDatabase();
    expect(mockDb.closeSync).toHaveBeenCalled();
  });
});
