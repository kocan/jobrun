import { getCustomers, saveCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerById, filterCustomers } from '../lib/storage/customers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer } from '../lib/types';

// Mock AsyncStorage
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
    __getStore: () => store,
    __resetStore: () => { store = {}; },
  };
});

const makeCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'test-id-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-1234',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  (AsyncStorage as any).__resetStore();
  vi.clearAllMocks();
});

describe('Customer Storage', () => {
  test('getCustomers returns empty array initially', async () => {
    const result = await getCustomers();
    expect(result).toEqual([]);
  });

  test('addCustomer stores and returns customer', async () => {
    const customer = makeCustomer();
    const result = await addCustomer(customer);
    expect(result).toEqual(customer);

    const all = await getCustomers();
    expect(all).toHaveLength(1);
    expect(all[0].firstName).toBe('John');
  });

  test('updateCustomer updates existing customer', async () => {
    await addCustomer(makeCustomer());
    const updated = await updateCustomer('test-id-1', { firstName: 'Jane' });
    expect(updated).not.toBeNull();
    expect(updated!.firstName).toBe('Jane');
    expect(updated!.lastName).toBe('Doe');

    const all = await getCustomers();
    expect(all[0].firstName).toBe('Jane');
  });

  test('updateCustomer returns null for non-existent id', async () => {
    const result = await updateCustomer('nonexistent', { firstName: 'X' });
    expect(result).toBeNull();
  });

  test('deleteCustomer removes customer', async () => {
    await addCustomer(makeCustomer({ id: 'a' }));
    await addCustomer(makeCustomer({ id: 'b', firstName: 'Bob' }));

    const result = await deleteCustomer('a');
    expect(result).toBe(true);

    const all = await getCustomers();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('b');
  });

  test('deleteCustomer returns false for non-existent id', async () => {
    const result = await deleteCustomer('nonexistent');
    expect(result).toBe(false);
  });

  test('getCustomerById returns customer or null', async () => {
    await addCustomer(makeCustomer());
    const found = await getCustomerById('test-id-1');
    expect(found?.firstName).toBe('John');

    const notFound = await getCustomerById('nope');
    expect(notFound).toBeNull();
  });

  test('filterCustomers filters by name, email, phone', () => {
    const customers = [
      makeCustomer({ id: '1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', phone: '111' }),
      makeCustomer({ id: '2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com', phone: '222' }),
      makeCustomer({ id: '3', firstName: 'Charlie', lastName: 'Alison', email: 'charlie@test.com', phone: '333' }),
    ];

    expect(filterCustomers(customers, 'ali')).toHaveLength(2); // Alice + Alison
    expect(filterCustomers(customers, 'bob@')).toHaveLength(1);
    expect(filterCustomers(customers, '222')).toHaveLength(1);
    expect(filterCustomers(customers, '')).toHaveLength(3);
    expect(filterCustomers(customers, 'zzz')).toHaveLength(0);
  });
});
