import {
  getServices, saveServices, addService, updateService, deleteService,
  reorderServices, buildServicesFromDefaults, getServicesByCategory,
  getActiveServices, calculateLineItemTotal, calculateTotal,
} from '../lib/storage/priceBook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PriceBookService } from '../lib/types';

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => Promise.resolve(store[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    __resetStore: () => { store = {}; },
  };
});

const makeService = (overrides: Partial<PriceBookService> = {}): PriceBookService => ({
  id: 'svc-1',
  name: 'Driveway Wash',
  description: 'Standard driveway wash',
  price: 150,
  estimatedDuration: 60,
  category: 'General',
  isActive: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  (AsyncStorage as any).__resetStore();
  vi.clearAllMocks();
});

describe('Price Book CRUD', () => {
  test('getServices returns empty array when no data', async () => {
    expect(await getServices()).toEqual([]);
  });

  test('saveServices and getServices round-trip', async () => {
    const services = [makeService()];
    await saveServices(services);
    expect(await getServices()).toEqual(services);
  });

  test('addService appends to list', async () => {
    const s1 = makeService({ id: 'svc-1' });
    const s2 = makeService({ id: 'svc-2', name: 'House Wash' });
    await addService(s1);
    await addService(s2);
    const all = await getServices();
    expect(all).toHaveLength(2);
    expect(all[1].name).toBe('House Wash');
  });

  test('updateService modifies existing', async () => {
    await saveServices([makeService()]);
    const updated = await updateService('svc-1', { price: 200 });
    expect(updated?.price).toBe(200);
    const all = await getServices();
    expect(all[0].price).toBe(200);
  });

  test('updateService returns null for missing id', async () => {
    await saveServices([makeService()]);
    expect(await updateService('missing', { price: 200 })).toBeNull();
  });

  test('deleteService removes item', async () => {
    await saveServices([makeService({ id: 'svc-1' }), makeService({ id: 'svc-2' })]);
    expect(await deleteService('svc-1')).toBe(true);
    expect(await getServices()).toHaveLength(1);
  });

  test('deleteService returns false for missing id', async () => {
    await saveServices([makeService()]);
    expect(await deleteService('missing')).toBe(false);
  });

  test('reorderServices updates sort order', async () => {
    await saveServices([
      makeService({ id: 'a', sortOrder: 0 }),
      makeService({ id: 'b', sortOrder: 1 }),
      makeService({ id: 'c', sortOrder: 2 }),
    ]);
    await reorderServices(['c', 'a', 'b']);
    const all = await getServices();
    const byId = (id: string) => all.find((s) => s.id === id)!;
    expect(byId('c').sortOrder).toBe(0);
    expect(byId('a').sortOrder).toBe(1);
    expect(byId('b').sortOrder).toBe(2);
  });
});

describe('buildServicesFromDefaults', () => {
  test('creates services from templates', () => {
    let counter = 0;
    const genId = () => `id-${counter++}`;
    const defaults = [
      { name: 'Wash', price: 100, description: 'desc' },
      { name: 'Rinse', price: 50, category: 'Extras', estimatedDuration: 30 },
    ];
    const result = buildServicesFromDefaults(defaults, genId);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('id-0');
    expect(result[0].category).toBe('General'); // default
    expect(result[0].estimatedDuration).toBe(60); // default
    expect(result[0].isActive).toBe(true);
    expect(result[1].category).toBe('Extras');
    expect(result[1].estimatedDuration).toBe(30);
  });
});

describe('filtering helpers', () => {
  test('getServicesByCategory groups correctly', () => {
    const services = [
      makeService({ id: 'a', category: 'Washing', sortOrder: 1 }),
      makeService({ id: 'b', category: 'Washing', sortOrder: 0 }),
      makeService({ id: 'c', category: 'Extras', sortOrder: 0 }),
    ];
    const grouped = getServicesByCategory(services);
    expect(Object.keys(grouped)).toEqual(['Washing', 'Extras']);
    expect(grouped['Washing'][0].id).toBe('b'); // sorted by sortOrder
  });

  test('getActiveServices filters inactive', () => {
    const services = [
      makeService({ id: 'a', isActive: true }),
      makeService({ id: 'b', isActive: false }),
    ];
    expect(getActiveServices(services)).toHaveLength(1);
    expect(getActiveServices(services)[0].id).toBe('a');
  });
});

describe('line item calculations', () => {
  test('calculateLineItemTotal', () => {
    expect(calculateLineItemTotal(150, 2)).toBe(300);
    expect(calculateLineItemTotal(33.33, 3)).toBe(99.99);
  });

  test('calculateTotal sums line items', () => {
    expect(calculateTotal([
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 },
    ])).toBe(250);
  });

  test('calculateTotal returns 0 for empty', () => {
    expect(calculateTotal([])).toBe(0);
  });

  test('calculateTotal handles floating point', () => {
    expect(calculateTotal([
      { price: 0.1, quantity: 3 },
    ])).toBe(0.3);
  });
});
