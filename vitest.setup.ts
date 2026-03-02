import { vi } from 'vitest';

Object.defineProperty(globalThis, '__DEV__', {
  value: false,
  writable: true,
});

vi.mock('react-native', () => {
  const component = 'View';
  const mock = {
    Alert: { alert: vi.fn() },
    Dimensions: { get: vi.fn(() => ({ width: 390, height: 844 })) },
    Keyboard: { dismiss: vi.fn() },
    Platform: {
      OS: 'ios',
      select: (options: Record<string, unknown>) => options.ios ?? options.default,
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (styles: unknown) => styles,
    },
    Text: component,
    TextInput: component,
    TouchableOpacity: component,
    View: component,
  } as Record<string, unknown>;

  return new Proxy(mock, {
    get(target, prop: string) {
      if (prop in target) {
        return target[prop];
      }
      return component;
    },
  });
});

vi.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();

  return {
    default: {
      clear: vi.fn(async () => storage.clear()),
      getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
      getAllKeys: vi.fn(async () => Array.from(storage.keys())),
      multiRemove: vi.fn(async (keys: string[]) => {
        for (const key of keys) {
          storage.delete(key);
        }
      }),
      removeItem: vi.fn(async (key: string) => storage.delete(key)),
      setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
    },
  };
});

vi.mock('@react-native-community/netinfo', () => {
  const addEventListener = vi.fn(() => vi.fn());
  const fetch = vi.fn(async () => ({ isConnected: true, isInternetReachable: true }));

  return {
    default: { addEventListener, fetch },
    addEventListener,
    fetch,
  };
});

vi.mock('expo-sqlite', () => {
  const db = {
    execSync: vi.fn(),
    getAllSync: vi.fn(() => []),
    getFirstSync: vi.fn(() => null),
    runSync: vi.fn(() => ({ changes: 0 })),
    withTransactionSync: vi.fn((callback: () => void) => callback()),
  };

  return {
    default: {
      openDatabaseSync: vi.fn(() => db),
    },
    openDatabaseSync: vi.fn(() => db),
  };
});
