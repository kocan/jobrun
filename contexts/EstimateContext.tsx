import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { Estimate, EstimateStatus } from '../lib/types';
import * as repo from '../lib/db/repositories/estimates';

interface EstimateContextType {
  estimates: Estimate[];
  loading: boolean;
  refreshEstimates: () => Promise<void>;
  addEstimate: (data: Omit<Estimate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Estimate>;
  updateEstimate: (id: string, data: Partial<Estimate>) => Promise<Estimate | null>;
  deleteEstimate: (id: string) => Promise<boolean>;
  getEstimateById: (id: string) => Estimate | undefined;
  getEstimatesByCustomer: (customerId: string) => Estimate[];
  getEstimatesByStatus: (status: EstimateStatus) => Estimate[];
}

const EstimateContext = createContext<EstimateContextType | undefined>(undefined);

export function EstimateProvider({ children }: { children: ReactNode }) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshEstimates = useCallback(async () => {
    setLoading(true);
    try { setEstimates(repo.getEstimates()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshEstimates(); }, [refreshEstimates]);

  const addEstimate = useCallback(async (data: Omit<Estimate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const estimate: Estimate = { ...data, id: Crypto.randomUUID(), createdAt: now, updatedAt: now };
    repo.addEstimate(estimate);
    setEstimates((prev) => [...prev, estimate]);
    return estimate;
  }, []);

  const updateEstimate = useCallback(async (id: string, data: Partial<Estimate>) => {
    const updated = repo.updateEstimate(id, data);
    if (updated) setEstimates((prev) => prev.map((e) => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const deleteEstimate = useCallback(async (id: string) => {
    const success = repo.deleteEstimate(id);
    if (success) setEstimates((prev) => prev.filter((e) => e.id !== id));
    return success;
  }, []);

  const getEstimateById = useCallback((id: string) => estimates.find((e) => e.id === id), [estimates]);
  const getEstimatesByCustomer = useCallback((customerId: string) => repo.filterEstimatesByCustomer(estimates, customerId), [estimates]);
  const getEstimatesByStatus = useCallback((status: EstimateStatus) => repo.filterEstimatesByStatus(estimates, status), [estimates]);

  return (
    <EstimateContext.Provider value={{ estimates, loading, refreshEstimates, addEstimate, updateEstimate, deleteEstimate, getEstimateById, getEstimatesByCustomer, getEstimatesByStatus }}>
      {children}
    </EstimateContext.Provider>
  );
}

export function useEstimates() {
  const ctx = useContext(EstimateContext);
  if (!ctx) throw new Error('useEstimates must be used within EstimateProvider');
  return ctx;
}
