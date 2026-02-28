import { describe, it, expect, vi } from 'vitest';

vi.mock('expo-file-system', () => ({
  cacheDirectory: '/tmp/',
  writeAsStringAsync: vi.fn(),
  EncodingType: { UTF8: 'utf8' },
}));
vi.mock('expo-sharing', () => ({
  shareAsync: vi.fn(),
}));

import { customersToCSV, jobsToCSV, invoicesToCSV } from '../lib/csvExport';

function makeCustomer(overrides: Record<string, any> = {}) {
  return {
    id: 'c1', firstName: 'John', lastName: 'Doe', email: 'john@example.com',
    phone: '555-1234', address: '123 Main St', city: 'Springfield',
    state: 'IL', zip: '62701', notes: '',
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

function makeJob(overrides: Record<string, any> = {}) {
  return {
    id: 'j1', customerId: 'c1', title: 'Test Job',
    status: 'completed', scheduledDate: '2026-02-01', scheduledTime: '09:00',
    estimatedDuration: 60, total: 150, notes: '', photos: [], lineItems: [],
    createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z',
    ...overrides,
  };
}

function makeInvoice(overrides: Record<string, any> = {}) {
  return {
    id: 'i1', customerId: 'c1', invoiceNumber: 'INV-001', status: 'paid',
    subtotal: 150, taxRate: 0.07, taxAmount: 10.5, total: 160.5,
    dueDate: '2026-02-15', paidAt: '2026-02-10T14:30:00Z',
    paymentTerms: 'net-30', notes: '', lineItems: [],
    createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z',
    ...overrides,
  };
}

describe('customersToCSV edge cases', () => {
  it('handles RTL text in names', () => {
    const csv = customersToCSV([makeCustomer({ firstName: 'محمد', lastName: 'العربي' })] as any);
    expect(csv).toContain('محمد');
    expect(csv).toContain('العربي');
  });

  it('handles tab characters in fields', () => {
    const csv = customersToCSV([makeCustomer({ notes: 'col1\tcol2' })] as any);
    expect(csv).toContain('col1\tcol2');
  });

  it('handles only commas as value', () => {
    const csv = customersToCSV([makeCustomer({ notes: ',,,' })] as any);
    expect(csv).toContain('",,,"');
  });

  it('handles numeric-looking strings in zip', () => {
    const csv = customersToCSV([makeCustomer({ zip: '01234' })] as any);
    expect(csv).toContain('01234');
  });

  it('handles fields that look like formulas', () => {
    const csv = customersToCSV([makeCustomer({ notes: '=SUM(A1:A10)' })] as any);
    expect(csv).toContain('=SUM(A1:A10)');
  });

  it('handles very long first name (1000 chars)', () => {
    const longName = 'A'.repeat(1000);
    const csv = customersToCSV([makeCustomer({ firstName: longName })] as any);
    expect(csv).toContain(longName);
  });

  it('handles createdAt without T separator', () => {
    const csv = customersToCSV([makeCustomer({ createdAt: '2026-01-15' })] as any);
    expect(csv).toContain('2026-01-15');
  });

  it('handles 50 customers', () => {
    const customers = Array.from({ length: 50 }, (_, i) =>
      makeCustomer({ id: `c${i}`, firstName: `Name${i}` })
    );
    const csv = customersToCSV(customers as any);
    expect(csv.split('\n')).toHaveLength(51);
  });
});

describe('jobsToCSV edge cases', () => {
  it('handles negative total', () => {
    const csv = jobsToCSV([makeJob({ total: -50 })] as any, {});
    expect(csv).toContain('-50');
  });

  it('handles decimal total', () => {
    const csv = jobsToCSV([makeJob({ total: 99.99 })] as any, {});
    expect(csv).toContain('99.99');
  });

  it('handles notes with quotes and commas', () => {
    const csv = jobsToCSV([makeJob({ notes: 'Customer said "hurry, please"' })] as any, {});
    expect(csv).toContain('"Customer said ""hurry, please"""');
  });

  it('handles scheduledDate as empty string', () => {
    const csv = jobsToCSV([makeJob({ scheduledDate: '' })] as any, {});
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('handles all statuses', () => {
    const statuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
    const jobs = statuses.map((s) => makeJob({ id: s, status: s }));
    const csv = jobsToCSV(jobs as any, {});
    for (const s of statuses) {
      expect(csv).toContain(s);
    }
  });

  it('handles customer name with special chars in map', () => {
    const csv = jobsToCSV([makeJob()] as any, { c1: "O'Brien, Jr." });
    expect(csv).toContain("O'Brien");
  });
});

describe('invoicesToCSV edge cases', () => {
  it('handles fractional tax rate', () => {
    const csv = invoicesToCSV([makeInvoice({ taxRate: 0.0825 })] as any, {});
    expect(csv).toContain('0.0825');
  });

  it('handles paidAt with no time component', () => {
    const csv = invoicesToCSV([makeInvoice({ paidAt: '2026-02-10' })] as any, {});
    expect(csv).toContain('2026-02-10');
  });

  it('handles empty string paymentTerms', () => {
    const csv = invoicesToCSV([makeInvoice({ paymentTerms: '' })] as any, {});
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('handles all invoice statuses', () => {
    const statuses = ['draft', 'sent', 'paid', 'overdue', 'void'];
    const invoices = statuses.map((s, i) =>
      makeInvoice({ id: `i${i}`, invoiceNumber: `INV-${i}`, status: s })
    );
    const csv = invoicesToCSV(invoices as any, {});
    expect(csv.split('\n')).toHaveLength(6);
  });

  it('handles very large amounts', () => {
    const csv = invoicesToCSV([makeInvoice({ total: 999999999.99 })] as any, {});
    expect(csv).toContain('999999999.99');
  });

  it('handles notes with newlines and quotes combined', () => {
    const csv = invoicesToCSV([makeInvoice({ notes: 'Line 1\n"Quote"' })] as any, {});
    expect(csv).toContain('"Line 1\n""Quote"""');
  });
});
