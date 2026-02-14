import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer } from '../types';

const STORAGE_KEY = '@jobrun_customers';

export async function getCustomers(): Promise<Customer[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveCustomers(customers: Customer[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

export async function addCustomer(customer: Customer): Promise<Customer> {
  const customers = await getCustomers();
  customers.push(customer);
  await saveCustomers(customers);
  return customer;
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
  const customers = await getCustomers();
  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) return null;
  customers[index] = { ...customers[index], ...updates, updatedAt: new Date().toISOString() };
  await saveCustomers(customers);
  return customers[index];
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const customers = await getCustomers();
  const filtered = customers.filter((c) => c.id !== id);
  if (filtered.length === customers.length) return false;
  await saveCustomers(filtered);
  return true;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const customers = await getCustomers();
  return customers.find((c) => c.id === id) || null;
}

export function filterCustomers(customers: Customer[], query: string): Customer[] {
  if (!query.trim()) return customers;
  const q = query.toLowerCase();
  return customers.filter(
    (c) =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
  );
}
