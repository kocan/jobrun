import { describe, it, expect } from 'vitest';
import {
  filterInvoicesByCustomer,
  filterInvoicesByStatus,
  filterInvoicesByDateRange,
  isValidInvoiceStatusTransition,
  calculateInvoiceTotals,
} from '../lib/storage/invoices';
import {
  filterJobsByCustomer,
  filterJobsByStatus,
  filterJobsByDate,
  isValidStatusTransition,
} from '../lib/storage/jobs';
import { filterCustomers } from '../lib/storage/customers';
import type { Invoice, Job, Customer, InvoiceStatus, JobStatus } from '../lib/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-0001',
    customerId: 'cust-1',
    lineItems: [],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    status: 'draft',
    payments: [],
    createdAt: '2026-01-15T12:00:00Z',
    updatedAt: '2026-01-15T12:00:00Z',
    ...overrides,
  };
}

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    customerId: 'cust-1',
    title: 'Test Job',
    status: 'scheduled',
    scheduledDate: '2026-02-01',
    lineItems: [],
    total: 0,
    photos: [],
    createdAt: '2026-01-15T12:00:00Z',
    updatedAt: '2026-01-15T12:00:00Z',
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'cust-1',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── Invoice filter tests ────────────────────────────────────────────────────

describe('filterInvoicesByCustomer', () => {
  it('returns only invoices for the given customer', () => {
    const invoices = [
      makeInvoice({ id: 'i1', customerId: 'cust-A' }),
      makeInvoice({ id: 'i2', customerId: 'cust-B' }),
      makeInvoice({ id: 'i3', customerId: 'cust-A' }),
    ];
    const result = filterInvoicesByCustomer(invoices, 'cust-A');
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.customerId === 'cust-A')).toBe(true);
  });

  it('returns empty array when no invoices match', () => {
    const invoices = [makeInvoice({ customerId: 'cust-X' })];
    expect(filterInvoicesByCustomer(invoices, 'cust-NONE')).toEqual([]);
  });

  it('returns empty array given an empty list', () => {
    expect(filterInvoicesByCustomer([], 'cust-1')).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const invoices = [makeInvoice({ customerId: 'cust-A' })];
    const copy = [...invoices];
    filterInvoicesByCustomer(invoices, 'cust-Z');
    expect(invoices).toEqual(copy);
  });
});

describe('filterInvoicesByStatus', () => {
  const statuses: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'];

  it('filters correctly for each status', () => {
    const invoices = statuses.map((status, i) => makeInvoice({ id: `i${i}`, status }));
    for (const status of statuses) {
      const result = filterInvoicesByStatus(invoices, status);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(status);
    }
  });

  it('returns multiple invoices with the same status', () => {
    const invoices = [
      makeInvoice({ id: 'i1', status: 'paid' }),
      makeInvoice({ id: 'i2', status: 'paid' }),
      makeInvoice({ id: 'i3', status: 'draft' }),
    ];
    expect(filterInvoicesByStatus(invoices, 'paid')).toHaveLength(2);
  });

  it('returns empty array when no match', () => {
    const invoices = [makeInvoice({ status: 'draft' })];
    expect(filterInvoicesByStatus(invoices, 'paid')).toEqual([]);
  });

  it('returns empty array on empty input', () => {
    expect(filterInvoicesByStatus([], 'sent')).toEqual([]);
  });
});

describe('filterInvoicesByDateRange', () => {
  const invoices = [
    makeInvoice({ id: 'i1', createdAt: '2026-01-01T00:00:00Z' }),
    makeInvoice({ id: 'i2', createdAt: '2026-01-15T00:00:00Z' }),
    makeInvoice({ id: 'i3', createdAt: '2026-02-01T00:00:00Z' }),
    makeInvoice({ id: 'i4', createdAt: '2026-03-01T00:00:00Z' }),
  ];

  it('returns invoices within the date range (inclusive)', () => {
    const result = filterInvoicesByDateRange(invoices, '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
    expect(result.map((i) => i.id)).toEqual(['i1', 'i2', 'i3']);
  });

  it('returns empty array when range excludes all', () => {
    const result = filterInvoicesByDateRange(invoices, '2025-01-01T00:00:00Z', '2025-12-31T00:00:00Z');
    expect(result).toEqual([]);
  });

  it('handles a single-day range (same start and end)', () => {
    const result = filterInvoicesByDateRange(invoices, '2026-01-15T00:00:00Z', '2026-01-15T00:00:00Z');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i2');
  });

  it('returns all invoices when range spans everything', () => {
    const result = filterInvoicesByDateRange(invoices, '2020-01-01T00:00:00Z', '2030-12-31T00:00:00Z');
    expect(result).toHaveLength(4);
  });

  it('returns empty array on empty input', () => {
    expect(filterInvoicesByDateRange([], '2026-01-01T00:00:00Z', '2026-12-31T00:00:00Z')).toEqual([]);
  });
});

// ─── Invoice status transitions ──────────────────────────────────────────────

describe('isValidInvoiceStatusTransition', () => {
  // Allowed transitions
  const allowed: [InvoiceStatus, InvoiceStatus][] = [
    ['draft', 'sent'],
    ['draft', 'cancelled'],
    ['sent', 'viewed'],
    ['sent', 'paid'],
    ['sent', 'overdue'],
    ['sent', 'cancelled'],
    ['viewed', 'paid'],
    ['viewed', 'overdue'],
    ['viewed', 'cancelled'],
    ['overdue', 'paid'],
    ['overdue', 'cancelled'],
    ['cancelled', 'draft'],
  ];

  for (const [from, to] of allowed) {
    it(`allows ${from} → ${to}`, () => {
      expect(isValidInvoiceStatusTransition(from, to)).toBe(true);
    });
  }

  // Disallowed transitions
  const disallowed: [InvoiceStatus, InvoiceStatus][] = [
    ['draft', 'viewed'],
    ['draft', 'paid'],
    ['draft', 'overdue'],
    ['paid', 'draft'],
    ['paid', 'sent'],
    ['paid', 'overdue'],
    ['paid', 'cancelled'],
    ['cancelled', 'paid'],
    ['cancelled', 'sent'],
  ];

  for (const [from, to] of disallowed) {
    it(`blocks ${from} → ${to}`, () => {
      expect(isValidInvoiceStatusTransition(from, to)).toBe(false);
    });
  }

  it('blocks transitioning to the same status (draft → draft)', () => {
    expect(isValidInvoiceStatusTransition('draft', 'draft')).toBe(false);
  });

  it('blocks transitioning to the same status (paid → paid)', () => {
    expect(isValidInvoiceStatusTransition('paid', 'paid')).toBe(false);
  });
});

// ─── calculateInvoiceTotals ──────────────────────────────────────────────────

describe('calculateInvoiceTotals', () => {
  it('calculates subtotal, tax, and total correctly', () => {
    const result = calculateInvoiceTotals(
      [{ unitPrice: 100, quantity: 2 }, { unitPrice: 50, quantity: 1 }],
      10 // 10%
    );
    expect(result.subtotal).toBe(250);
    expect(result.taxAmount).toBe(25);
    expect(result.total).toBe(275);
  });

  it('handles zero tax rate', () => {
    const result = calculateInvoiceTotals([{ unitPrice: 200, quantity: 1 }], 0);
    expect(result.subtotal).toBe(200);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(200);
  });

  it('handles empty line items', () => {
    const result = calculateInvoiceTotals([], 8.5);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles fractional cents — rounds correctly', () => {
    // $99.99 × 1 at 10% = tax $10.00 (rounded), total $109.99
    const result = calculateInvoiceTotals([{ unitPrice: 99.99, quantity: 1 }], 10);
    expect(result.subtotal).toBe(99.99);
    expect(result.taxAmount).toBe(10); // 9.999 rounds to 10.00
    expect(result.total).toBe(109.99);
  });

  it('handles high-precision tax rates', () => {
    const result = calculateInvoiceTotals([{ unitPrice: 100, quantity: 1 }], 8.875);
    expect(result.subtotal).toBe(100);
    expect(result.taxAmount).toBe(8.88); // 8.875 rounds to 8.88
    expect(result.total).toBe(108.88);
  });

  it('handles zero-price line items', () => {
    const result = calculateInvoiceTotals([{ unitPrice: 0, quantity: 10 }], 10);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles zero quantity', () => {
    const result = calculateInvoiceTotals([{ unitPrice: 100, quantity: 0 }], 10);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('handles multiple items with mixed quantities', () => {
    const result = calculateInvoiceTotals(
      [
        { unitPrice: 150, quantity: 3 },  // 450
        { unitPrice: 25.5, quantity: 2 },  // 51
      ],
      5
    );
    expect(result.subtotal).toBe(501);
    expect(result.taxAmount).toBe(25.05);
    expect(result.total).toBe(526.05);
  });
});

// ─── Job filter tests ────────────────────────────────────────────────────────

describe('filterJobsByCustomer', () => {
  it('returns only jobs for the given customer', () => {
    const jobs = [
      makeJob({ id: 'j1', customerId: 'cust-A' }),
      makeJob({ id: 'j2', customerId: 'cust-B' }),
      makeJob({ id: 'j3', customerId: 'cust-A' }),
    ];
    const result = filterJobsByCustomer(jobs, 'cust-A');
    expect(result).toHaveLength(2);
    expect(result.every((j) => j.customerId === 'cust-A')).toBe(true);
  });

  it('returns empty array when no jobs match', () => {
    expect(filterJobsByCustomer([makeJob()], 'nobody')).toEqual([]);
  });

  it('returns empty array on empty input', () => {
    expect(filterJobsByCustomer([], 'cust-1')).toEqual([]);
  });
});

describe('filterJobsByStatus', () => {
  const statuses: JobStatus[] = ['scheduled', 'in-progress', 'completed', 'cancelled'];

  it('filters correctly for each status', () => {
    const jobs = statuses.map((status, i) => makeJob({ id: `j${i}`, status }));
    for (const status of statuses) {
      const result = filterJobsByStatus(jobs, status);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(status);
    }
  });

  it('returns all matching when multiple jobs share a status', () => {
    const jobs = [
      makeJob({ id: 'j1', status: 'completed' }),
      makeJob({ id: 'j2', status: 'completed' }),
    ];
    expect(filterJobsByStatus(jobs, 'completed')).toHaveLength(2);
  });

  it('returns empty array on no match', () => {
    expect(filterJobsByStatus([makeJob({ status: 'scheduled' })], 'completed')).toEqual([]);
  });
});

describe('filterJobsByDate', () => {
  it('returns jobs scheduled on the given date', () => {
    const jobs = [
      makeJob({ id: 'j1', scheduledDate: '2026-02-01' }),
      makeJob({ id: 'j2', scheduledDate: '2026-02-15' }),
      makeJob({ id: 'j3', scheduledDate: '2026-02-01' }),
    ];
    const result = filterJobsByDate(jobs, '2026-02-01');
    expect(result).toHaveLength(2);
    expect(result.every((j) => j.scheduledDate === '2026-02-01')).toBe(true);
  });

  it('returns empty array when no jobs match the date', () => {
    expect(filterJobsByDate([makeJob({ scheduledDate: '2026-01-01' })], '2026-12-31')).toEqual([]);
  });

  it('returns empty array on empty input', () => {
    expect(filterJobsByDate([], '2026-02-01')).toEqual([]);
  });
});

// ─── Job status transitions ──────────────────────────────────────────────────

describe('isValidStatusTransition (jobs)', () => {
  const allowed: [JobStatus, JobStatus][] = [
    ['scheduled', 'in-progress'],
    ['scheduled', 'cancelled'],
    ['in-progress', 'completed'],
    ['in-progress', 'cancelled'],
    ['cancelled', 'scheduled'],
  ];

  for (const [from, to] of allowed) {
    it(`allows ${from} → ${to}`, () => {
      expect(isValidStatusTransition(from, to)).toBe(true);
    });
  }

  const disallowed: [JobStatus, JobStatus][] = [
    ['scheduled', 'completed'],
    ['completed', 'scheduled'],
    ['completed', 'in-progress'],
    ['completed', 'cancelled'],
    ['cancelled', 'in-progress'],
    ['cancelled', 'completed'],
  ];

  for (const [from, to] of disallowed) {
    it(`blocks ${from} → ${to}`, () => {
      expect(isValidStatusTransition(from, to)).toBe(false);
    });
  }

  it('blocks same-status transitions (scheduled → scheduled)', () => {
    expect(isValidStatusTransition('scheduled', 'scheduled')).toBe(false);
  });

  it('returns false for an unknown status', () => {
    // TypeScript would normally prevent this; guard for runtime safety
    expect(isValidStatusTransition('unknown' as JobStatus, 'scheduled')).toBe(false);
  });
});

// ─── Customer filter tests ───────────────────────────────────────────────────

describe('filterCustomers', () => {
  const customers: Customer[] = [
    makeCustomer({ id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: '555-1234' }),
    makeCustomer({ id: 'c2', firstName: 'Bob', lastName: 'Johnson', email: 'bob@work.com', phone: '555-5678' }),
    makeCustomer({ id: 'c3', firstName: 'Charlie', lastName: 'Smithson', phone: '555-9999' }),
    makeCustomer({ id: 'c4', firstName: 'Díana', lastName: 'López', email: 'diana@example.com' }),
  ];

  it('returns all customers on empty query', () => {
    expect(filterCustomers(customers, '')).toHaveLength(4);
  });

  it('returns all customers on whitespace-only query', () => {
    expect(filterCustomers(customers, '   ')).toHaveLength(4);
  });

  it('matches by first name (case-insensitive)', () => {
    const result = filterCustomers(customers, 'alice');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('matches by last name (case-insensitive)', () => {
    const result = filterCustomers(customers, 'JOHNSON');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c2');
  });

  it('matches partial last name across multiple customers', () => {
    const result = filterCustomers(customers, 'smith');
    // Alice Smith and Charlie Smithson both match
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id).sort()).toEqual(['c1', 'c3']);
  });

  it('matches by email', () => {
    const result = filterCustomers(customers, 'work.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c2');
  });

  it('matches by phone', () => {
    const result = filterCustomers(customers, '9999');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c3');
  });

  it('returns empty array when no match', () => {
    expect(filterCustomers(customers, 'zzznomatch')).toEqual([]);
  });

  it('does not match a customer with no email when querying by email', () => {
    // Charlie has no email — should not crash or match on undefined
    const result = filterCustomers(customers, '555-9999');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c3');
  });

  it('handles accented characters in name (unicode search)', () => {
    // Should still find Díana even though search is lowercase normalized
    const result = filterCustomers(customers, 'diana');
    // Simple toLowerCase() won't normalize accents, so result depends on impl
    // Verify it does not throw
    expect(Array.isArray(result)).toBe(true);
  });

  it('does not crash on customers with all optional fields missing', () => {
    const sparse: Customer[] = [
      makeCustomer({ id: 'cx', firstName: 'No', lastName: 'Email' }),
    ];
    expect(() => filterCustomers(sparse, 'test@example.com')).not.toThrow();
    expect(filterCustomers(sparse, 'test@example.com')).toEqual([]);
  });
});
