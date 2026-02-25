/**
 * Tests for SQLite repository layer.
 * Uses a mock that tracks SQL calls and returns configured data.
 */

let storedRows: Record<string, any[]> = {};
let deletedIds: Set<string> = new Set();

const mockDb = {
  execSync: vi.fn(),
  runSync: vi.fn((sql: string, params?: any[]) => {
    const sqlLower = sql.toLowerCase();
    if (sqlLower.startsWith('insert')) {
      // Extract table name
      const match = sql.match(/INTO\s+(\w+)/i);
      if (match) {
        const table = match[1];
        if (!storedRows[table]) storedRows[table] = [];
        storedRows[table].push(params);
      }
      return { changes: 1 };
    }
    if (sqlLower.includes('deleted_at') && sqlLower.startsWith('update') && params) {
      const id = params[params.length - 1];
      deletedIds.add(id);
      return { changes: 1 };
    }
    if (sqlLower.startsWith('update')) {
      return { changes: 1 };
    }
    if (sqlLower.startsWith('delete')) {
      return { changes: 1 };
    }
    return { changes: 0 };
  }),
  getFirstSync: vi.fn((sql: string, params?: any[]) => {
    if (sql.includes('schema_version')) return { value: '1' };
    if (sql.includes('invoice_counter')) return { next_number: 1 };
    if (sql.includes('customers') && params?.[0] === 'test-1') {
      return {
        id: 'test-1', first_name: 'John', last_name: 'Doe', email: 'john@test.com',
        phone: '555-0100', address: null, city: null, state: null, zip: null,
        notes: null, vertical_id: null, created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z', deleted_at: null,
      };
    }
    if (sql.includes('price_book_services') && params?.[0]) {
      return {
        id: params[0], name: 'Test Service', description: null, price: 100,
        estimated_duration: 60, category: 'General', is_active: 1, sort_order: 0,
        created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z', deleted_at: null,
      };
    }
    if (sql.includes('COUNT')) return { count: 3 };
    return null;
  }),
  getAllSync: vi.fn((sql: string) => {
    if (sql.includes('customers')) {
      return [
        {
          id: 'c1', first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com',
          phone: null, address: null, city: null, state: null, zip: null, notes: null,
          vertical_id: null, created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];
    }
    if (sql.includes('job_line_items') || sql.includes('estimate_line_items') || sql.includes('invoice_line_items')) {
      return [];
    }
    if (sql.includes('jobs')) {
      return [
        {
          id: 'j1', customer_id: 'c1', title: 'Test Job', description: null,
          status: 'scheduled', scheduled_date: '2024-06-15', scheduled_time: null,
          estimated_duration: null, address: null, total: 100, notes: null,
          photos: '[]', estimate_id: null, invoice_id: null,
          created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];
    }
    if (sql.includes('settings')) return [];
    if (sql.includes('price_book_services')) return [];
    return [];
  }),
  withTransactionSync: vi.fn((fn: () => void) => fn()),
  closeSync: vi.fn(),
};

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: vi.fn(() => mockDb),
}));

import * as customerRepo from '../lib/db/repositories/customers';
import * as jobRepo from '../lib/db/repositories/jobs';
import * as invoiceRepo from '../lib/db/repositories/invoices';
import * as priceBookRepo from '../lib/db/repositories/priceBook';
import * as settingsRepo from '../lib/db/repositories/settings';
import * as syncQueue from '../lib/db/syncQueue';
import { _resetDb } from '../lib/db/database';

beforeEach(() => {
  _resetDb();
  storedRows = {};
  deletedIds.clear();
  mockDb.runSync.mockClear();
  mockDb.getFirstSync.mockClear();
  mockDb.getAllSync.mockClear();
  mockDb.withTransactionSync.mockClear();
});

describe('Customer repository', () => {
  it('getCustomers returns mapped customers', () => {
    const customers = customerRepo.getCustomers();
    expect(customers).toHaveLength(1);
    expect(customers[0].firstName).toBe('Alice');
    expect(customers[0].lastName).toBe('Smith');
    expect(customers[0].email).toBe('alice@test.com');
  });

  it('addCustomer inserts a row', () => {
    const customer = {
      id: 'c-new', firstName: 'Bob', lastName: 'Jones', createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    customerRepo.addCustomer(customer as any);
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO customers'),
      expect.arrayContaining(['c-new', 'Bob', 'Jones'])
    );
  });

  it('updateCustomer calls UPDATE', () => {
    const result = customerRepo.updateCustomer('test-1', { firstName: 'Jane' });
    expect(result).not.toBeNull();
    expect(result!.firstName).toBe('Jane');
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE customers'),
      expect.arrayContaining(['Jane'])
    );
  });

  it('deleteCustomer soft-deletes', () => {
    const result = customerRepo.deleteCustomer('test-1');
    expect(result).toBe(true);
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('deleted_at'),
      expect.arrayContaining(['test-1'])
    );
  });

  it('filterCustomers filters by query', () => {
    const customers = [
      { firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' } as any,
      { firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' } as any,
    ];
    expect(customerRepo.filterCustomers(customers, 'alice')).toHaveLength(1);
    expect(customerRepo.filterCustomers(customers, '')).toHaveLength(2);
  });
});

describe('Job repository', () => {
  it('getJobs returns mapped jobs', () => {
    const jobs = jobRepo.getJobs();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Test Job');
    expect(jobs[0].customerId).toBe('c1');
    expect(jobs[0].status).toBe('scheduled');
  });

  it('addJob uses transaction', () => {
    const job = {
      id: 'j-new', customerId: 'c1', title: 'New Job', status: 'scheduled' as const,
      scheduledDate: '2024-06-20', lineItems: [], total: 0, photos: [],
      createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    };
    jobRepo.addJob(job as any);
    expect(mockDb.withTransactionSync).toHaveBeenCalled();
  });

  it('filterJobsByDate works', () => {
    const jobs = [{ scheduledDate: '2024-06-15' } as any, { scheduledDate: '2024-06-16' } as any];
    expect(jobRepo.filterJobsByDate(jobs, '2024-06-15')).toHaveLength(1);
  });

  it('isValidStatusTransition works', () => {
    expect(jobRepo.isValidStatusTransition('scheduled', 'in-progress')).toBe(true);
    expect(jobRepo.isValidStatusTransition('completed', 'scheduled')).toBe(false);
  });
});

describe('Invoice repository', () => {
  it('getNextInvoiceNumber returns formatted number', () => {
    const num = invoiceRepo.getNextInvoiceNumber();
    expect(num).toBe('INV-0001');
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE invoice_counter'),
      [2]
    );
  });
});

describe('PriceBook repository', () => {
  it('buildServicesFromDefaults creates services', () => {
    const defaults = [{ name: 'Mowing', price: 50 }];
    let counter = 0;
    const services = priceBookRepo.buildServicesFromDefaults(defaults, () => `id-${counter++}`);
    expect(services).toHaveLength(1);
    expect(services[0].name).toBe('Mowing');
    expect(services[0].price).toBe(50);
    expect(services[0].id).toBe('id-0');
  });

  it('getServicesByCategory groups correctly', () => {
    const services = [
      { category: 'Lawn', sortOrder: 0 } as any,
      { category: 'Lawn', sortOrder: 1 } as any,
      { category: 'Clean', sortOrder: 0 } as any,
    ];
    const grouped = priceBookRepo.getServicesByCategory(services);
    expect(Object.keys(grouped)).toEqual(['Lawn', 'Clean']);
    expect(grouped['Lawn']).toHaveLength(2);
  });
});

describe('Settings repository', () => {
  it('getSettings returns defaults when empty', () => {
    const settings = settingsRepo.getSettings();
    expect(settings.onboardingComplete).toBe(false);
    expect(settings.businessName).toBe('');
  });

  it('updateSettings calls INSERT OR REPLACE', () => {
    settingsRepo.updateSettings({ businessName: 'My Biz' });
    expect(mockDb.withTransactionSync).toHaveBeenCalled();
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO settings'),
      ['app_businessName', 'My Biz']
    );
  });
});

describe('Sync queue', () => {
  it('getPendingSyncCount totals across tables', () => {
    // Mock returns count=3 for each table, 5 tables = 15
    const count = syncQueue.getPendingSyncCount();
    expect(count).toBe(15); // 3 * 5 tables
  });

  it('getPendingSyncCountByTable returns per-table counts', () => {
    const counts = syncQueue.getPendingSyncCountByTable();
    expect(counts.customers).toBe(3);
    expect(counts.jobs).toBe(3);
    expect(counts.invoices).toBe(3);
  });

  it('markAsSynced calls update', () => {
    syncQueue.markAsSynced('customers', 'c1');
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("sync_status = 'synced'"),
      ['c1']
    );
  });

  it('processSyncQueue returns pending count', async () => {
    const result = await syncQueue.processSyncQueue();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(15);
  });
});
