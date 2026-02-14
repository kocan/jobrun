import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { Invoice, InvoiceStatus, Job, Estimate } from '../lib/types';
import * as storage from '../lib/storage/invoices';

interface InvoiceContextType {
  invoices: Invoice[];
  loading: boolean;
  refreshInvoices: () => Promise<void>;
  addInvoice: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<Invoice | null>;
  deleteInvoice: (id: string) => Promise<boolean>;
  getInvoiceById: (id: string) => Invoice | undefined;
  getInvoicesByCustomer: (customerId: string) => Invoice[];
  getInvoicesByStatus: (status: InvoiceStatus) => Invoice[];
  getInvoiceByJobId: (jobId: string) => Invoice | undefined;
  createInvoiceFromJob: (job: Job) => Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>;
  createInvoiceFromEstimate: (estimate: Estimate) => Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>;
  markAsPaid: (id: string) => Promise<Invoice | null>;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export function InvoiceProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storage.getInvoices();
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshInvoices();
  }, [refreshInvoices]);

  const addInvoice = useCallback(
    async (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const invoiceNumber = await storage.getNextInvoiceNumber();
      const invoice: Invoice = {
        ...data,
        id: Crypto.randomUUID(),
        invoiceNumber,
        createdAt: now,
        updatedAt: now,
      };
      await storage.addInvoice(invoice);
      setInvoices((prev) => [...prev, invoice]);
      return invoice;
    },
    []
  );

  const updateInvoice = useCallback(async (id: string, data: Partial<Invoice>) => {
    const updated = await storage.updateInvoice(id, data);
    if (updated) {
      setInvoices((prev) => prev.map((i) => (i.id === id ? updated : i)));
    }
    return updated;
  }, []);

  const deleteInvoice = useCallback(async (id: string) => {
    const success = await storage.deleteInvoice(id);
    if (success) {
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    }
    return success;
  }, []);

  const getInvoiceById = useCallback(
    (id: string) => invoices.find((i) => i.id === id),
    [invoices]
  );

  const getInvoicesByCustomer = useCallback(
    (customerId: string) => storage.filterInvoicesByCustomer(invoices, customerId),
    [invoices]
  );

  const getInvoicesByStatus = useCallback(
    (status: InvoiceStatus) => storage.filterInvoicesByStatus(invoices, status),
    [invoices]
  );

  const getInvoiceByJobId = useCallback(
    (jobId: string) => invoices.find((i) => i.jobId === jobId),
    [invoices]
  );

  const createInvoiceFromJob = useCallback(
    (job: Job): Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'> => {
      const subtotal = Math.round(job.lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0) * 100) / 100;
      return {
        customerId: job.customerId,
        jobId: job.id,
        estimateId: job.estimateId,
        lineItems: job.lineItems,
        subtotal,
        taxRate: 0,
        taxAmount: 0,
        total: subtotal,
        status: 'draft',
        paymentTerms: 'Due upon receipt',
        payments: [],
      };
    },
    []
  );

  const createInvoiceFromEstimate = useCallback(
    (estimate: Estimate): Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'> => {
      return {
        customerId: estimate.customerId,
        estimateId: estimate.id,
        jobId: estimate.jobId,
        lineItems: estimate.lineItems,
        subtotal: estimate.subtotal,
        taxRate: estimate.taxRate,
        taxAmount: estimate.taxAmount,
        total: estimate.total,
        status: 'draft',
        paymentTerms: 'Due upon receipt',
        payments: [],
      };
    },
    []
  );

  const markAsPaid = useCallback(async (id: string) => {
    return updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() });
  }, [updateInvoice]);

  return (
    <InvoiceContext.Provider
      value={{
        invoices, loading, refreshInvoices, addInvoice, updateInvoice, deleteInvoice,
        getInvoiceById, getInvoicesByCustomer, getInvoicesByStatus, getInvoiceByJobId,
        createInvoiceFromJob, createInvoiceFromEstimate, markAsPaid,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error('useInvoices must be used within InvoiceProvider');
  return ctx;
}
