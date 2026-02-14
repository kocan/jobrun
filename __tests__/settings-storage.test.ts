import {
  getSettings, saveSettings, updateSettings, isOnboardingComplete,
  clearSettings, defaultSettings, AppSettings,
} from '../lib/storage/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

beforeEach(() => {
  (AsyncStorage as any).__resetStore();
  jest.clearAllMocks();
});

describe('Settings Storage', () => {
  test('getSettings returns defaults when empty', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(defaultSettings);
    expect(settings.onboardingComplete).toBe(false);
    expect(settings.selectedVertical).toBeNull();
    expect(settings.businessName).toBe('');
  });

  test('saveSettings persists and retrieves', async () => {
    const data: AppSettings = {
      ...defaultSettings,
      businessName: 'Test Biz',
      businessPhone: '555-1234',
      businessEmail: 'test@test.com',
      selectedVertical: 'pressure-washing',
      onboardingComplete: true,
    };
    await saveSettings(data);
    const loaded = await getSettings();
    expect(loaded).toEqual(data);
  });

  test('updateSettings merges partial updates', async () => {
    await saveSettings({ ...defaultSettings, businessName: 'Old Name' });
    const updated = await updateSettings({ businessName: 'New Name', businessPhone: '999' });
    expect(updated.businessName).toBe('New Name');
    expect(updated.businessPhone).toBe('999');
    expect(updated.onboardingComplete).toBe(false);
  });

  test('isOnboardingComplete returns correct value', async () => {
    expect(await isOnboardingComplete()).toBe(false);
    await updateSettings({ onboardingComplete: true });
    expect(await isOnboardingComplete()).toBe(true);
  });

  test('clearSettings resets to defaults', async () => {
    await saveSettings({ ...defaultSettings, businessName: 'Biz', onboardingComplete: true });
    await clearSettings();
    const settings = await getSettings();
    expect(settings).toEqual(defaultSettings);
  });
});
