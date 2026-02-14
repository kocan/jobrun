import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { Customer } from '../lib/types';
import * as storage from '../lib/storage/customers';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  refreshCustomers: () => Promise<void>;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer | null>;
  deleteCustomer: (id: string) => Promise<boolean>;
  getCustomerById: (id: string) => Customer | undefined;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storage.getCustomers();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCustomers();
  }, [refreshCustomers]);

  const addCustomer = useCallback(
    async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const customer: Customer = {
        ...data,
        id: Crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      await storage.addCustomer(customer);
      setCustomers((prev) => [...prev, customer]);
      return customer;
    },
    []
  );

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    const updated = await storage.updateCustomer(id, data);
    if (updated) {
      setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
    return updated;
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    const success = await storage.deleteCustomer(id);
    if (success) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
    return success;
  }, []);

  const getCustomerById = useCallback(
    (id: string) => customers.find((c) => c.id === id),
    [customers]
  );

  return (
    <CustomerContext.Provider
      value={{ customers, loading, refreshCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerById }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomers must be used within CustomerProvider');
  return ctx;
}
