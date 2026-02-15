import { getDatabase } from '../database';
import { VerticalId } from '../../types';

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

export function getSettings(): AppSettings {
  const db = getDatabase();
  const rows = db.getAllSync("SELECT key, value FROM settings WHERE key LIKE 'app_%'") as { key: string; value: string }[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    selectedVertical: (map.get('app_selectedVertical') as VerticalId | 'custom' | null) ?? defaultSettings.selectedVertical,
    businessName: map.get('app_businessName') ?? defaultSettings.businessName,
    businessPhone: map.get('app_businessPhone') ?? defaultSettings.businessPhone,
    businessEmail: map.get('app_businessEmail') ?? defaultSettings.businessEmail,
    onboardingComplete: map.get('app_onboardingComplete') === 'true',
  };
}

export function saveSettings(settings: AppSettings): void {
  const db = getDatabase();
  const entries: [string, string][] = [
    ['app_selectedVertical', settings.selectedVertical ?? ''],
    ['app_businessName', settings.businessName],
    ['app_businessPhone', settings.businessPhone],
    ['app_businessEmail', settings.businessEmail],
    ['app_onboardingComplete', String(settings.onboardingComplete)],
  ];
  db.withTransactionSync(() => {
    for (const [key, value] of entries) {
      db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
  });
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  saveSettings(updated);
  return updated;
}

export function isOnboardingComplete(): boolean {
  return getSettings().onboardingComplete;
}

export function clearSettings(): void {
  const db = getDatabase();
  db.runSync("DELETE FROM settings WHERE key LIKE 'app_%'");
}
