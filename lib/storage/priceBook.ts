import AsyncStorage from '@react-native-async-storage/async-storage';
import { PriceBookService, DefaultServiceTemplate } from '../types';

const STORAGE_KEY = '@jobrun_pricebook';

export async function getServices(): Promise<PriceBookService[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveServices(services: PriceBookService[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(services));
}

export async function addService(service: PriceBookService): Promise<PriceBookService> {
  const services = await getServices();
  services.push(service);
  await saveServices(services);
  return service;
}

export async function updateService(id: string, updates: Partial<PriceBookService>): Promise<PriceBookService | null> {
  const services = await getServices();
  const index = services.findIndex((s) => s.id === id);
  if (index === -1) return null;
  services[index] = { ...services[index], ...updates, updatedAt: new Date().toISOString() };
  await saveServices(services);
  return services[index];
}

export async function deleteService(id: string): Promise<boolean> {
  const services = await getServices();
  const filtered = services.filter((s) => s.id !== id);
  if (filtered.length === services.length) return false;
  await saveServices(filtered);
  return true;
}

export async function reorderServices(orderedIds: string[]): Promise<void> {
  const services = await getServices();
  const map = new Map(services.map((s) => [s.id, s]));
  const reordered: PriceBookService[] = [];
  orderedIds.forEach((id, i) => {
    const s = map.get(id);
    if (s) {
      reordered.push({ ...s, sortOrder: i });
      map.delete(id);
    }
  });
  // append any not in the ordered list
  map.forEach((s) => reordered.push(s));
  await saveServices(reordered);
}

export function buildServicesFromDefaults(
  defaults: DefaultServiceTemplate[],
  generateId: () => string,
): PriceBookService[] {
  const now = new Date().toISOString();
  return defaults.map((d, i) => ({
    id: generateId(),
    name: d.name,
    description: d.description,
    price: d.price,
    estimatedDuration: d.estimatedDuration ?? 60,
    category: d.category ?? 'General',
    isActive: true,
    sortOrder: i,
    createdAt: now,
    updatedAt: now,
  }));
}

export function getServicesByCategory(services: PriceBookService[]): Record<string, PriceBookService[]> {
  const grouped: Record<string, PriceBookService[]> = {};
  for (const s of services) {
    const cat = s.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }
  // sort within each category
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return grouped;
}

export function getActiveServices(services: PriceBookService[]): PriceBookService[] {
  return services.filter((s) => s.isActive);
}

export function calculateLineItemTotal(price: number, quantity: number): number {
  return Math.round(price * quantity * 100) / 100;
}

export function calculateTotal(lineItems: { price: number; quantity: number }[]): number {
  return Math.round(lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0) * 100) / 100;
}
