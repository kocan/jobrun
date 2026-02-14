import AsyncStorage from '@react-native-async-storage/async-storage';
import { Invoice, InvoiceStatus } from '../types';

const STORAGE_KEY = '@jobrun_invoices';
const COUNTER_KEY = '@jobrun_invoice_counter';

export async function getInvoices(): Promise<Invoice[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export async function getNextInvoiceNumber(): Promise<string> {
  const raw = await AsyncStorage.getItem(COUNTER_KEY);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await AsyncStorage.setItem(COUNTER_KEY, String(next));
  return `INV-${String(next).padStart(4, '0')}`;
}

export async function addInvoice(invoice: Invoice): Promise<Invoice> {
  const invoices = await getInvoices();
  invoices.push(invoice);
  await saveInvoices(invoices);
  return invoice;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
  const invoices = await getInvoices();
  const index = invoices.findIndex((i) => i.id === id);
  if (index === -1) return null;
  invoices[index] = { ...invoices[index], ...updates, updatedAt: new Date().toISOString() };
  await saveInvoices(invoices);
  return invoices[index];
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const invoices = await getInvoices();
  const filtered = invoices.filter((i) => i.id !== id);
  if (filtered.length === invoices.length) return false;
  await saveInvoices(filtered);
  return true;
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoices = await getInvoices();
  return invoices.find((i) => i.id === id) || null;
}

export function filterInvoicesByCustomer(invoices: Invoice[], customerId: string): Invoice[] {
  return invoices.filter((i) => i.customerId === customerId);
}

export function filterInvoicesByStatus(invoices: Invoice[], status: InvoiceStatus): Invoice[] {
  return invoices.filter((i) => i.status === status);
}

export function filterInvoicesByDateRange(invoices: Invoice[], startDate: string, endDate: string): Invoice[] {
  return invoices.filter((i) => i.createdAt >= startDate && i.createdAt <= endDate);
}

export function isValidInvoiceStatusTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  const transitions: Record<InvoiceStatus, InvoiceStatus[]> = {
    'draft': ['sent', 'cancelled'],
    'sent': ['viewed', 'paid', 'overdue', 'cancelled'],
    'viewed': ['paid', 'overdue', 'cancelled'],
    'paid': [],
    'overdue': ['paid', 'cancelled'],
    'cancelled': ['draft'],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function calculateInvoiceTotals(
  lineItems: { unitPrice: number; quantity: number }[],
  taxRate: number
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = Math.round(lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}
