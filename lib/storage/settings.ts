import AsyncStorage from '@react-native-async-storage/async-storage';
import { VerticalId } from '../types';

const STORAGE_KEY = '@jobrun_settings';

export interface AppSettings {
  selectedVertical: VerticalId | 'custom' | null;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  onboardingComplete: boolean;
}

export const defaultSettings: AppSettings = {
  selectedVertical: null,
  businessName: '',
  businessPhone: '',
  businessEmail: '',
  onboardingComplete: false,
};

export async function getSettings(): Promise<AppSettings> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return { ...defaultSettings };
  return { ...defaultSettings, ...JSON.parse(json) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await saveSettings(updated);
  return updated;
}

export async function isOnboardingComplete(): Promise<boolean> {
  const settings = await getSettings();
  return settings.onboardingComplete;
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
