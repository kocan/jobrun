import { getDatabase } from '../database';
import { VerticalId } from '../../types';
import { SettingsRow } from '../types';

export interface AppSettings {
  selectedVertical: VerticalId | 'custom' | null;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  onboardingComplete: boolean;
  notifyPaymentReceived: boolean;
  notifyEstimateAccepted: boolean;
  notifyAppointmentReminder: boolean;
}

export const defaultSettings: AppSettings = {
  selectedVertical: null,
  businessName: '',
  businessPhone: '',
  businessEmail: '',
  onboardingComplete: false,
  notifyPaymentReceived: true,
  notifyEstimateAccepted: true,
  notifyAppointmentReminder: true,
};

export function getSettings(): AppSettings {
  const db = getDatabase();
  const rows = db.getAllSync<SettingsRow>("SELECT key, value FROM settings WHERE key LIKE 'app_%'");
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    selectedVertical: (map.get('app_selectedVertical') as VerticalId | 'custom' | null) ?? defaultSettings.selectedVertical,
    businessName: map.get('app_businessName') ?? defaultSettings.businessName,
    businessPhone: map.get('app_businessPhone') ?? defaultSettings.businessPhone,
    businessEmail: map.get('app_businessEmail') ?? defaultSettings.businessEmail,
    onboardingComplete: map.get('app_onboardingComplete') === 'true',
    notifyPaymentReceived: map.get('app_notifyPaymentReceived') !== 'false',
    notifyEstimateAccepted: map.get('app_notifyEstimateAccepted') !== 'false',
    notifyAppointmentReminder: map.get('app_notifyAppointmentReminder') !== 'false',
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
    ['app_notifyPaymentReceived', String(settings.notifyPaymentReceived)],
    ['app_notifyEstimateAccepted', String(settings.notifyEstimateAccepted)],
    ['app_notifyAppointmentReminder', String(settings.notifyAppointmentReminder)],
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
