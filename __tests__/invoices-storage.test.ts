import {
  getInvoices, saveInvoices, addInvoice, updateInvoice, deleteInvoice,
  getInvoiceById, getNextInvoiceNumber, filterInvoicesByCustomer, filterInvoicesByStatus,
  filterInvoicesByDateRange, isValidInvoiceStatusTransition, calculateInvoiceTotals,
} from '../lib/storage/invoices';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Invoice, InvoiceStatus } from '../lib/types';

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    __resetStore: () => { store = {}; },
  };
});

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-1',
  invoiceNumber: 'INV-0001',
  customerId: 'cust-1',
  lineItems: [
    { id: 'li-1', name: 'Pressure Wash', quantity: 2, unitPrice: 100, total: 200 },
  ],
  subtotal: 200,
  taxRate: 8,
  taxAmount: 16,
  total: 216,
  status: 'draft',
  paymentTerms: 'Due upon receipt',
  dueDate: '2026-03-16',
  payments: [],
  notes: 'Test invoice',
  createdAt: '2026-02-14T12:00:00.000Z',
  updatedAt: '2026-02-14T12:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  (AsyncStorage as any).__resetStore();
  jest.clearAllMocks();
});

describe('Invoice CRUD', () => {
  it('returns empty array when no invoices', async () => {
    expect(await getInvoices()).toEqual([]);
  });

  it('adds and retrieves an invoice', async () => {
    const inv = makeInvoice();
    await addInvoice(inv);
    const all = await getInvoices();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('inv-1');
  });

  it('gets invoice by id', async () => {
    await addInvoice(makeInvoice());
    const found = await getInvoiceById('inv-1');
    expect(found).not.toBeNull();
    expect(found!.invoiceNumber).toBe('INV-0001');
  });

  it('returns null for non-existent id', async () => {
    expect(await getInvoiceById('nope')).toBeNull();
  });

  it('updates an invoice', async () => {
    await addInvoice(makeInvoice());
    const updated = await updateInvoice('inv-1', { status: 'sent' });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('sent');
  });

  it('returns null when updating non-existent', async () => {
    expect(await updateInvoice('nope', { status: 'sent' })).toBeNull();
  });

  it('deletes an invoice', async () => {
    await addInvoice(makeInvoice());
    expect(await deleteInvoice('inv-1')).toBe(true);
    expect(await getInvoices()).toHaveLength(0);
  });

  it('returns false when deleting non-existent', async () => {
    expect(await deleteInvoice('nope')).toBe(false);
  });
});

describe('Invoice number generation', () => {
  it('generates sequential invoice numbers', async () => {
    const n1 = await getNextInvoiceNumber();
    const n2 = await getNextInvoiceNumber();
    const n3 = await getNextInvoiceNumber();
    expect(n1).toBe('INV-0001');
    expect(n2).toBe('INV-0002');
    expect(n3).toBe('INV-0003');
  });
});

describe('Invoice filters', () => {
  const invoices = [
    makeInvoice({ id: 'i1', customerId: 'c1', status: 'draft', createdAt: '2026-01-15T00:00:00.000Z' }),
    makeInvoice({ id: 'i2', customerId: 'c2', status: 'sent', createdAt: '2026-02-14T00:00:00.000Z' }),
    makeInvoice({ id: 'i3', customerId: 'c1', status: 'paid', createdAt: '2026-03-01T00:00:00.000Z' }),
  ];

  it('filters by customer', () => {
    expect(filterInvoicesByCustomer(invoices, 'c1')).toHaveLength(2);
    expect(filterInvoicesByCustomer(invoices, 'c2')).toHaveLength(1);
  });

  it('filters by status', () => {
    expect(filterInvoicesByStatus(invoices, 'draft')).toHaveLength(1);
    expect(filterInvoicesByStatus(invoices, 'paid')).toHaveLength(1);
  });

  it('filters by date range', () => {
    expect(filterInvoicesByDateRange(invoices, '2026-02-01', '2026-02-28')).toHaveLength(1);
    expect(filterInvoicesByDateRange(invoices, '2026-01-01', '2026-12-31')).toHaveLength(3);
  });
});

describe('calculateInvoiceTotals', () => {
  it('calculates subtotal, tax, and total', () => {
    const items = [
      { unitPrice: 100, quantity: 2 },
      { unitPrice: 50, quantity: 1 },
    ];
    const result = calculateInvoiceTotals(items, 10);
    expect(result.subtotal).toBe(250);
    expect(result.taxAmount).toBe(25);
    expect(result.total).toBe(275);
  });

  it('handles zero tax rate', () => {
    const items = [{ unitPrice: 75, quantity: 3 }];
    const result = calculateInvoiceTotals(items, 0);
    expect(result.subtotal).toBe(225);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(225);
  });

  it('handles empty line items', () => {
    const result = calculateInvoiceTotals([], 10);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const items = [{ unitPrice: 33.33, quantity: 3 }];
    const result = calculateInvoiceTotals(items, 7.5);
    expect(result.subtotal).toBe(99.99);
    expect(result.taxAmount).toBe(7.5);
    expect(result.total).toBe(107.49);
  });
});

describe('Status transitions', () => {
  it('allows draft → sent', () => {
    expect(isValidInvoiceStatusTransition('draft', 'sent')).toBe(true);
  });

  it('allows draft → cancelled', () => {
    expect(isValidInvoiceStatusTransition('draft', 'cancelled')).toBe(true);
  });

  it('allows sent → paid', () => {
    expect(isValidInvoiceStatusTransition('sent', 'paid')).toBe(true);
  });

  it('allows sent → overdue', () => {
    expect(isValidInvoiceStatusTransition('sent', 'overdue')).toBe(true);
  });

  it('allows overdue → paid', () => {
    expect(isValidInvoiceStatusTransition('overdue', 'paid')).toBe(true);
  });

  it('disallows paid → anything', () => {
    expect(isValidInvoiceStatusTransition('paid', 'draft')).toBe(false);
    expect(isValidInvoiceStatusTransition('paid', 'sent')).toBe(false);
  });

  it('allows cancelled → draft', () => {
    expect(isValidInvoiceStatusTransition('cancelled', 'draft')).toBe(true);
  });

  it('disallows draft → paid directly', () => {
    expect(isValidInvoiceStatusTransition('draft', 'paid')).toBe(false);
  });
});
