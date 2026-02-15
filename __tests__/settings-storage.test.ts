import { getSettings, saveSettings, updateSettings, isOnboardingComplete, clearSettings, defaultSettings, AppSettings } from '../lib/storage/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
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
    __getStore: () => store,
    __resetStore: () => { store = {}; },
  };
});

beforeEach(() => {
  (AsyncStorage as any).__resetStore();
  jest.clearAllMocks();
});

describe('Settings Storage', () => {
  describe('getSettings', () => {
    it('returns default settings when none saved', async () => {
      const settings = await getSettings();
      expect(settings).toEqual(defaultSettings);
    });

    it('returns saved settings merged with defaults', async () => {
      const partial = { businessName: 'Test Biz', onboardingComplete: true };
      await AsyncStorage.setItem('@jobrun_settings', JSON.stringify(partial));
      const settings = await getSettings();
      expect(settings.businessName).toBe('Test Biz');
      expect(settings.onboardingComplete).toBe(true);
      expect(settings.businessPhone).toBe(''); // default
    });
  });

  describe('saveSettings', () => {
    it('saves full settings object', async () => {
      const settings: AppSettings = {
        ...defaultSettings,
        businessName: 'My Business',
        onboardingComplete: true,
      };
      await saveSettings(settings);
      const stored = JSON.parse((AsyncStorage as any).__getStore()['@jobrun_settings']);
      expect(stored.businessName).toBe('My Business');
    });
  });

  describe('updateSettings', () => {
    it('merges updates with existing settings', async () => {
      await saveSettings({ ...defaultSettings, businessName: 'Original' });
      const updated = await updateSettings({ businessPhone: '555-1234' });
      expect(updated.businessName).toBe('Original');
      expect(updated.businessPhone).toBe('555-1234');
    });
  });

  describe('isOnboardingComplete', () => {
    it('returns false by default', async () => {
      expect(await isOnboardingComplete()).toBe(false);
    });

    it('returns true after completion', async () => {
      await saveSettings({ ...defaultSettings, onboardingComplete: true });
      expect(await isOnboardingComplete()).toBe(true);
    });
  });

  describe('clearSettings', () => {
    it('removes settings from storage', async () => {
      await saveSettings({ ...defaultSettings, businessName: 'Test' });
      await clearSettings();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@jobrun_settings');
    });
  });
});
