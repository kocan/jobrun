import AsyncStorage from '@react-native-async-storage/async-storage';
import { Estimate, EstimateStatus } from '../types';

const STORAGE_KEY = '@jobrun_estimates';

export async function getEstimates(): Promise<Estimate[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveEstimates(estimates: Estimate[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(estimates));
}

export async function addEstimate(estimate: Estimate): Promise<Estimate> {
  const estimates = await getEstimates();
  estimates.push(estimate);
  await saveEstimates(estimates);
  return estimate;
}

export async function updateEstimate(id: string, updates: Partial<Estimate>): Promise<Estimate | null> {
  const estimates = await getEstimates();
  const index = estimates.findIndex((e) => e.id === id);
  if (index === -1) return null;
  estimates[index] = { ...estimates[index], ...updates, updatedAt: new Date().toISOString() };
  await saveEstimates(estimates);
  return estimates[index];
}

export async function deleteEstimate(id: string): Promise<boolean> {
  const estimates = await getEstimates();
  const filtered = estimates.filter((e) => e.id !== id);
  if (filtered.length === estimates.length) return false;
  await saveEstimates(filtered);
  return true;
}

export async function getEstimateById(id: string): Promise<Estimate | null> {
  const estimates = await getEstimates();
  return estimates.find((e) => e.id === id) || null;
}

export function filterEstimatesByCustomer(estimates: Estimate[], customerId: string): Estimate[] {
  return estimates.filter((e) => e.customerId === customerId);
}

export function filterEstimatesByStatus(estimates: Estimate[], status: EstimateStatus): Estimate[] {
  return estimates.filter((e) => e.status === status);
}

export function isValidEstimateStatusTransition(from: EstimateStatus, to: EstimateStatus): boolean {
  const transitions: Record<EstimateStatus, EstimateStatus[]> = {
    'draft': ['sent'],
    'sent': ['accepted', 'declined', 'expired'],
    'viewed': ['accepted', 'declined', 'expired'],
    'accepted': [],
    'declined': ['draft'],
    'expired': ['draft'],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function calculateEstimateTotals(
  lineItems: { unitPrice: number; quantity: number }[],
  taxRate: number
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = Math.round(lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}
