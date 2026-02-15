import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { PriceBookService, DefaultServiceTemplate } from '../lib/types';
import * as repo from '../lib/db/repositories/priceBook';

interface PriceBookContextType {
  services: PriceBookService[];
  loading: boolean;
  refreshServices: () => Promise<void>;
  addService: (data: Omit<PriceBookService, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PriceBookService>;
  updateService: (id: string, data: Partial<PriceBookService>) => Promise<PriceBookService | null>;
  deleteService: (id: string) => Promise<boolean>;
  getServicesByCategory: () => Record<string, PriceBookService[]>;
  getActiveServices: () => PriceBookService[];
  initializeFromDefaults: (defaults: DefaultServiceTemplate[]) => Promise<void>;
  resetToDefaults: (defaults: DefaultServiceTemplate[]) => Promise<void>;
}

const PriceBookContext = createContext<PriceBookContextType | undefined>(undefined);

export function PriceBookProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<PriceBookService[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshServices = useCallback(async () => {
    setLoading(true);
    try { setServices(repo.getServices()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshServices(); }, [refreshServices]);

  const addService = useCallback(async (data: Omit<PriceBookService, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const service: PriceBookService = { ...data, id: Crypto.randomUUID(), createdAt: now, updatedAt: now };
    repo.addService(service);
    setServices((prev) => [...prev, service]);
    return service;
  }, []);

  const updateService = useCallback(async (id: string, data: Partial<PriceBookService>) => {
    const updated = repo.updateService(id, data);
    if (updated) setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);

  const deleteService = useCallback(async (id: string) => {
    const ok = repo.deleteService(id);
    if (ok) setServices((prev) => prev.filter((s) => s.id !== id));
    return ok;
  }, []);

  const getServicesByCategory = useCallback(() => repo.getServicesByCategory(services), [services]);
  const getActiveServices = useCallback(() => repo.getActiveServices(services), [services]);

  const initializeFromDefaults = useCallback(async (defaults: DefaultServiceTemplate[]) => {
    const existing = repo.getServices();
    if (existing.length > 0) return;
    const newServices = repo.buildServicesFromDefaults(defaults, () => Crypto.randomUUID());
    repo.saveServices(newServices);
    setServices(newServices);
  }, []);

  const resetToDefaults = useCallback(async (defaults: DefaultServiceTemplate[]) => {
    const newServices = repo.buildServicesFromDefaults(defaults, () => Crypto.randomUUID());
    repo.saveServices(newServices);
    setServices(newServices);
  }, []);

  return (
    <PriceBookContext.Provider value={{ services, loading, refreshServices, addService, updateService, deleteService, getServicesByCategory, getActiveServices, initializeFromDefaults, resetToDefaults }}>
      {children}
    </PriceBookContext.Provider>
  );
}

export function usePriceBook() {
  const ctx = useContext(PriceBookContext);
  if (!ctx) throw new Error('usePriceBook must be used within PriceBookProvider');
  return ctx;
}
