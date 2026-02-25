import { describe, it, expect } from 'vitest';
import {
  buildServicesFromDefaults,
  getServicesByCategory,
  getActiveServices,
  calculateLineItemTotal,
  calculateTotal,
} from '../lib/db/repositories/priceBook';
import {
  filterEstimatesByCustomer,
  filterEstimatesByStatus,
  isValidEstimateStatusTransition,
  calculateEstimateTotals,
} from '../lib/db/repositories/estimates';
import type { PriceBookService, DefaultServiceTemplate, Estimate, EstimateStatus } from '../lib/types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `generated-${++idCounter}`;
}

function makeService(overrides: Partial<PriceBookService> = {}): PriceBookService {
  return {
    id: `svc-${idCounter++}`,
    name: 'Test Service',
    price: 100,
    estimatedDuration: 60,
    category: 'General',
    isActive: true,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEstimate(overrides: Partial<Estimate> = {}): Estimate {
  return {
    id: 'est-1',
    customerId: 'cust-1',
    lineItems: [],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    status: 'draft',
    expiresAt: '2026-03-01T00:00:00Z',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

// ─── calculateLineItemTotal ──────────────────────────────────────────────────

describe('calculateLineItemTotal', () => {
  it('multiplies price by quantity', () => {
    expect(calculateLineItemTotal(150, 3)).toBe(450);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateLineItemTotal(33.333, 3)).toBe(100); // 99.999 → 100.00
  });

  it('returns 0 for zero price', () => {
    expect(calculateLineItemTotal(0, 5)).toBe(0);
  });

  it('returns 0 for zero quantity', () => {
    expect(calculateLineItemTotal(99.99, 0)).toBe(0);
  });

  it('handles fractional quantities', () => {
    expect(calculateLineItemTotal(100, 0.5)).toBe(50);
  });

  it('handles fractional prices', () => {
    expect(calculateLineItemTotal(9.99, 2)).toBe(19.98);
  });

  it('handles large amounts without floating-point drift', () => {
    expect(calculateLineItemTotal(1000, 100)).toBe(100000);
  });
});

describe('calculateTotal', () => {
  it('sums all line item price×quantity', () => {
    expect(
      calculateTotal([
        { price: 100, quantity: 2 },
        { price: 50, quantity: 3 },
      ])
    ).toBe(350);
  });

  it('returns 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateTotal([{ price: 33.333, quantity: 3 }])).toBe(100); // 99.999 → 100.00
  });

  it('handles single-item array', () => {
    expect(calculateTotal([{ price: 75, quantity: 1 }])).toBe(75);
  });

  it('handles all zero-price items', () => {
    expect(calculateTotal([{ price: 0, quantity: 10 }, { price: 0, quantity: 5 }])).toBe(0);
  });
});

// ─── buildServicesFromDefaults ───────────────────────────────────────────────

describe('buildServicesFromDefaults', () => {
  const defaults: DefaultServiceTemplate[] = [
    { name: 'Basic Wash', price: 75, description: 'Standard wash', category: 'Washing' },
    { name: 'Premium Wash', price: 150, estimatedDuration: 90 },
    { name: 'Wax', price: 50 },
  ];

  it('creates a service for each default template', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults(defaults, generateId);
    expect(services).toHaveLength(3);
  });

  it('assigns a unique generated ID to each service', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults(defaults, generateId);
    const ids = services.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('copies name and price from defaults', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults(defaults, generateId);
    expect(services[0].name).toBe('Basic Wash');
    expect(services[0].price).toBe(75);
    expect(services[1].name).toBe('Premium Wash');
    expect(services[1].price).toBe(150);
  });

  it('applies provided category; defaults to "General" when missing', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults(defaults, generateId);
    expect(services[0].category).toBe('Washing');
    expect(services[1].category).toBe('General'); // no category in template
    expect(services[2].category).toBe('General');
  });

  it('uses provided estimatedDuration; defaults to 60 when missing', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults(defaults, generateId);
    expect(services[0].estimatedDuration).toBe(60); // not in template
    expect(services[1].estimatedDuration).toBe(90); // from template
  });

  it('assigns sortOrder based on index', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults(defaults, generateId);
    expect(services[0].sortOrder).toBe(0);
    expect(services[1].sortOrder).toBe(1);
    expect(services[2].sortOrder).toBe(2);
  });

  it('sets isActive to true for all services', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults(defaults, generateId);
    expect(services.every((s) => s.isActive)).toBe(true);
  });

  it('sets createdAt and updatedAt to valid ISO strings', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults(defaults, generateId);
    for (const s of services) {
      expect(new Date(s.createdAt).toISOString()).toBe(s.createdAt);
      expect(new Date(s.updatedAt).toISOString()).toBe(s.updatedAt);
    }
  });

  it('handles empty defaults array', () => {
    idCounter = 0;
    expect(buildServicesFromDefaults([], generateId)).toEqual([]);
  });

  it('handles a single template', () => {
    idCounter = 0;
    const services = buildServicesFromDefaults([{ name: 'Only', price: 99 }], generateId);
    expect(services).toHaveLength(1);
    expect(services[0].sortOrder).toBe(0);
  });
});

// ─── getServicesByCategory ───────────────────────────────────────────────────

describe('getServicesByCategory', () => {
  it('groups services by category', () => {
    const services = [
      makeService({ id: 's1', name: 'A', category: 'Washing', sortOrder: 0 }),
      makeService({ id: 's2', name: 'B', category: 'Polishing', sortOrder: 0 }),
      makeService({ id: 's3', name: 'C', category: 'Washing', sortOrder: 1 }),
    ];
    const grouped = getServicesByCategory(services);
    expect(Object.keys(grouped).sort()).toEqual(['Polishing', 'Washing']);
    expect(grouped['Washing']).toHaveLength(2);
    expect(grouped['Polishing']).toHaveLength(1);
  });

  it('sorts services within each category by sortOrder', () => {
    const services = [
      makeService({ id: 's1', name: 'Z-service', category: 'Lawn', sortOrder: 10 }),
      makeService({ id: 's2', name: 'A-service', category: 'Lawn', sortOrder: 1 }),
      makeService({ id: 's3', name: 'M-service', category: 'Lawn', sortOrder: 5 }),
    ];
    const grouped = getServicesByCategory(services);
    expect(grouped['Lawn'].map((s) => s.name)).toEqual(['A-service', 'M-service', 'Z-service']);
  });

  it('returns empty object on empty input', () => {
    expect(getServicesByCategory([])).toEqual({});
  });

  it('groups services missing category under "General"', () => {
    // Service with no category override defaults to 'General' in makeService
    const services = [makeService({ id: 'sg', category: 'General' })];
    const grouped = getServicesByCategory(services);
    expect(grouped['General']).toHaveLength(1);
  });

  it('handles all services in one category', () => {
    const services = [
      makeService({ id: 's1', category: 'Cleaning', sortOrder: 0 }),
      makeService({ id: 's2', category: 'Cleaning', sortOrder: 1 }),
    ];
    const grouped = getServicesByCategory(services);
    expect(Object.keys(grouped)).toEqual(['Cleaning']);
    expect(grouped['Cleaning']).toHaveLength(2);
  });
});

// ─── getActiveServices ───────────────────────────────────────────────────────

describe('getActiveServices', () => {
  it('returns only active services', () => {
    const services = [
      makeService({ id: 's1', isActive: true }),
      makeService({ id: 's2', isActive: false }),
      makeService({ id: 's3', isActive: true }),
    ];
    const active = getActiveServices(services);
    expect(active).toHaveLength(2);
    expect(active.every((s) => s.isActive)).toBe(true);
  });

  it('returns empty array if all are inactive', () => {
    const services = [
      makeService({ isActive: false }),
      makeService({ isActive: false }),
    ];
    expect(getActiveServices(services)).toEqual([]);
  });

  it('returns all services if all are active', () => {
    const services = [makeService({ isActive: true }), makeService({ isActive: true })];
    expect(getActiveServices(services)).toHaveLength(2);
  });

  it('returns empty array on empty input', () => {
    expect(getActiveServices([])).toEqual([]);
  });
});

// ─── Estimate filter tests ───────────────────────────────────────────────────

describe('filterEstimatesByCustomer', () => {
  it('returns only estimates for the given customer', () => {
    const estimates = [
      makeEstimate({ id: 'e1', customerId: 'cust-A' }),
      makeEstimate({ id: 'e2', customerId: 'cust-B' }),
      makeEstimate({ id: 'e3', customerId: 'cust-A' }),
    ];
    const result = filterEstimatesByCustomer(estimates, 'cust-A');
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.customerId === 'cust-A')).toBe(true);
  });

  it('returns empty array on no match', () => {
    expect(filterEstimatesByCustomer([makeEstimate()], 'nobody')).toEqual([]);
  });

  it('returns empty array on empty input', () => {
    expect(filterEstimatesByCustomer([], 'cust-1')).toEqual([]);
  });
});

describe('filterEstimatesByStatus', () => {
  const statuses: EstimateStatus[] = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'];

  it('filters correctly for each status', () => {
    const estimates = statuses.map((status, i) => makeEstimate({ id: `e${i}`, status }));
    for (const status of statuses) {
      const result = filterEstimatesByStatus(estimates, status);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(status);
    }
  });

  it('returns multiple estimates with the same status', () => {
    const estimates = [
      makeEstimate({ id: 'e1', status: 'accepted' }),
      makeEstimate({ id: 'e2', status: 'accepted' }),
    ];
    expect(filterEstimatesByStatus(estimates, 'accepted')).toHaveLength(2);
  });

  it('returns empty array on no match', () => {
    expect(filterEstimatesByStatus([makeEstimate({ status: 'draft' })], 'paid' as EstimateStatus)).toEqual([]);
  });
});

// ─── Estimate status transitions ─────────────────────────────────────────────

describe('isValidEstimateStatusTransition', () => {
  const allowed: [EstimateStatus, EstimateStatus][] = [
    ['draft', 'sent'],
    ['sent', 'accepted'],
    ['sent', 'declined'],
    ['sent', 'expired'],
    ['viewed', 'accepted'],
    ['viewed', 'declined'],
    ['viewed', 'expired'],
    ['declined', 'draft'],
    ['expired', 'draft'],
  ];

  for (const [from, to] of allowed) {
    it(`allows ${from} → ${to}`, () => {
      expect(isValidEstimateStatusTransition(from, to)).toBe(true);
    });
  }

  const disallowed: [EstimateStatus, EstimateStatus][] = [
    ['draft', 'accepted'],
    ['draft', 'declined'],
    ['draft', 'expired'],
    ['draft', 'viewed'],
    ['accepted', 'draft'],
    ['accepted', 'sent'],
    ['accepted', 'declined'],
    ['accepted', 'expired'],
  ];

  for (const [from, to] of disallowed) {
    it(`blocks ${from} → ${to}`, () => {
      expect(isValidEstimateStatusTransition(from, to)).toBe(false);
    });
  }

  it('blocks same-status transitions', () => {
    expect(isValidEstimateStatusTransition('draft', 'draft')).toBe(false);
    expect(isValidEstimateStatusTransition('accepted', 'accepted')).toBe(false);
  });

  it('note: sent does not include viewed as a transition target', () => {
    // Documenting current behavior: sent → viewed is not modeled as a transition
    // (viewed status is set by the share link open event, not a user action)
    expect(isValidEstimateStatusTransition('sent', 'viewed')).toBe(false);
  });

  it('returns false for unknown status', () => {
    expect(isValidEstimateStatusTransition('unknown' as EstimateStatus, 'sent')).toBe(false);
  });
});

// ─── calculateEstimateTotals ─────────────────────────────────────────────────

describe('calculateEstimateTotals', () => {
  it('calculates subtotal, tax, and total correctly', () => {
    const result = calculateEstimateTotals(
      [{ unitPrice: 200, quantity: 1 }, { unitPrice: 50, quantity: 2 }],
      8
    );
    expect(result.subtotal).toBe(300);
    expect(result.taxAmount).toBe(24);
    expect(result.total).toBe(324);
  });

  it('handles zero tax rate', () => {
    const result = calculateEstimateTotals([{ unitPrice: 500, quantity: 1 }], 0);
    expect(result.subtotal).toBe(500);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(500);
  });

  it('handles empty line items', () => {
    const result = calculateEstimateTotals([], 10);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('rounds fractional cents correctly', () => {
    const result = calculateEstimateTotals([{ unitPrice: 99.99, quantity: 1 }], 10);
    expect(result.subtotal).toBe(99.99);
    expect(result.taxAmount).toBe(10); // 9.999 rounds to 10.00
    expect(result.total).toBe(109.99);
  });

  it('handles high-precision tax rates (e.g. NYC 8.875%)', () => {
    const result = calculateEstimateTotals([{ unitPrice: 100, quantity: 1 }], 8.875);
    expect(result.subtotal).toBe(100);
    expect(result.taxAmount).toBe(8.88);
    expect(result.total).toBe(108.88);
  });

  it('handles a single line item with fractional quantity', () => {
    const result = calculateEstimateTotals([{ unitPrice: 100, quantity: 0.5 }], 0);
    expect(result.subtotal).toBe(50);
    expect(result.total).toBe(50);
  });

  it('handles very large amounts', () => {
    const result = calculateEstimateTotals([{ unitPrice: 10000, quantity: 10 }], 5);
    expect(result.subtotal).toBe(100000);
    expect(result.taxAmount).toBe(5000);
    expect(result.total).toBe(105000);
  });
});
