import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { VerticalId } from '../lib/types';
import * as settingsStorage from '../lib/storage/settings';
import { AppSettings } from '../lib/storage/settings';

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  isOnboardingComplete: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  completeOnboarding: (data: {
    businessName: string;
    businessPhone: string;
    businessEmail: string;
    selectedVertical: VerticalId | 'custom';
  }) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(settingsStorage.defaultSettings);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsStorage.getSettings();
      setSettings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const update = useCallback(async (updates: Partial<AppSettings>) => {
    const updated = await settingsStorage.updateSettings(updates);
    setSettings(updated);
  }, []);

  const completeOnboarding = useCallback(async (data: {
    businessName: string;
    businessPhone: string;
    businessEmail: string;
    selectedVertical: VerticalId | 'custom';
  }) => {
    const updated = await settingsStorage.updateSettings({
      ...data,
      onboardingComplete: true,
    });
    setSettings(updated);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        isOnboardingComplete: settings.onboardingComplete,
        updateSettings: update,
        completeOnboarding,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
