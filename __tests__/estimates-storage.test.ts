import {
  getEstimates, saveEstimates, addEstimate, updateEstimate, deleteEstimate,
  getEstimateById, filterEstimatesByCustomer, filterEstimatesByStatus,
  isValidEstimateStatusTransition, calculateEstimateTotals,
} from '../lib/storage/estimates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Estimate, EstimateStatus } from '../lib/types';

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

const makeEstimate = (overrides: Partial<Estimate> = {}): Estimate => ({
  id: 'est-1',
  customerId: 'cust-1',
  lineItems: [
    { id: 'li-1', name: 'Pressure Wash', quantity: 2, unitPrice: 100, total: 200 },
  ],
  subtotal: 200,
  taxRate: 8,
  taxAmount: 16,
  total: 216,
  status: 'draft',
  notes: 'Test estimate',
  expiresAt: '2026-03-16',
  createdAt: '2026-02-14T12:00:00.000Z',
  updatedAt: '2026-02-14T12:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  (AsyncStorage as any).__resetStore();
  jest.clearAllMocks();
});

describe('Estimate CRUD', () => {
  it('returns empty array when no estimates', async () => {
    expect(await getEstimates()).toEqual([]);
  });

  it('adds and retrieves an estimate', async () => {
    const est = makeEstimate();
    await addEstimate(est);
    const all = await getEstimates();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('est-1');
  });

  it('gets estimate by id', async () => {
    await addEstimate(makeEstimate());
    const found = await getEstimateById('est-1');
    expect(found).not.toBeNull();
    expect(found!.customerId).toBe('cust-1');
  });

  it('returns null for non-existent id', async () => {
    expect(await getEstimateById('nope')).toBeNull();
  });

  it('updates an estimate', async () => {
    await addEstimate(makeEstimate());
    const updated = await updateEstimate('est-1', { status: 'sent' });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('sent');
  });

  it('returns null when updating non-existent', async () => {
    expect(await updateEstimate('nope', { status: 'sent' })).toBeNull();
  });

  it('deletes an estimate', async () => {
    await addEstimate(makeEstimate());
    expect(await deleteEstimate('est-1')).toBe(true);
    expect(await getEstimates()).toHaveLength(0);
  });

  it('returns false when deleting non-existent', async () => {
    expect(await deleteEstimate('nope')).toBe(false);
  });
});

describe('Estimate filters', () => {
  const estimates = [
    makeEstimate({ id: 'e1', customerId: 'c1', status: 'draft' }),
    makeEstimate({ id: 'e2', customerId: 'c2', status: 'sent' }),
    makeEstimate({ id: 'e3', customerId: 'c1', status: 'accepted' }),
  ];

  it('filters by customer', () => {
    expect(filterEstimatesByCustomer(estimates, 'c1')).toHaveLength(2);
    expect(filterEstimatesByCustomer(estimates, 'c2')).toHaveLength(1);
  });

  it('filters by status', () => {
    expect(filterEstimatesByStatus(estimates, 'draft')).toHaveLength(1);
    expect(filterEstimatesByStatus(estimates, 'sent')).toHaveLength(1);
  });
});

describe('calculateEstimateTotals', () => {
  it('calculates subtotal, tax, and total', () => {
    const items = [
      { unitPrice: 100, quantity: 2 },
      { unitPrice: 50, quantity: 1 },
    ];
    const result = calculateEstimateTotals(items, 10);
    expect(result.subtotal).toBe(250);
    expect(result.taxAmount).toBe(25);
    expect(result.total).toBe(275);
  });

  it('handles zero tax rate', () => {
    const items = [{ unitPrice: 75, quantity: 3 }];
    const result = calculateEstimateTotals(items, 0);
    expect(result.subtotal).toBe(225);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(225);
  });

  it('handles empty line items', () => {
    const result = calculateEstimateTotals([], 10);
    expect(result.subtotal).toBe(0);
    expect(result.taxAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const items = [{ unitPrice: 33.33, quantity: 3 }];
    const result = calculateEstimateTotals(items, 7.5);
    expect(result.subtotal).toBe(99.99);
    expect(result.taxAmount).toBe(7.5);
    expect(result.total).toBe(107.49);
  });
});

describe('Status transitions', () => {
  it('allows draft → sent', () => {
    expect(isValidEstimateStatusTransition('draft', 'sent')).toBe(true);
  });

  it('allows sent → accepted', () => {
    expect(isValidEstimateStatusTransition('sent', 'accepted')).toBe(true);
  });

  it('allows sent → declined', () => {
    expect(isValidEstimateStatusTransition('sent', 'declined')).toBe(true);
  });

  it('disallows draft → accepted', () => {
    expect(isValidEstimateStatusTransition('draft', 'accepted')).toBe(false);
  });

  it('disallows accepted → draft', () => {
    expect(isValidEstimateStatusTransition('accepted', 'draft')).toBe(false);
  });

  it('allows declined → draft', () => {
    expect(isValidEstimateStatusTransition('declined', 'draft')).toBe(true);
  });

  it('allows expired → draft', () => {
    expect(isValidEstimateStatusTransition('expired', 'draft')).toBe(true);
  });
});
