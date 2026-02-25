import { getDatabase } from '../database';
import { Customer } from '../../types';
import { CustomerRow } from '../types';

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    zip: row.zip || undefined,
    notes: row.notes || undefined,
    verticalId: row.vertical_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getCustomers(): Customer[] {
  const db = getDatabase();
  const rows = db.getAllSync<CustomerRow>('SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY last_name, first_name');
  return rows.map(rowToCustomer);
}

export function getCustomerById(id: string): Customer | null {
  const db = getDatabase();
  const row = db.getFirstSync<CustomerRow>('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL', [id]);
  return row ? rowToCustomer(row) : null;
}

export function addCustomer(customer: Customer): Customer {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO customers (id, first_name, last_name, email, phone, address, city, state, zip, notes, vertical_id, sync_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [customer.id, customer.firstName, customer.lastName, customer.email ?? null, customer.phone ?? null,
     customer.address ?? null, customer.city ?? null, customer.state ?? null, customer.zip ?? null,
     customer.notes ?? null, customer.verticalId ?? null, customer.createdAt, customer.updatedAt]
  );
  return customer;
}

export function updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
  const existing = getCustomerById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const db = getDatabase();
  db.runSync(
    `UPDATE customers SET first_name=?, last_name=?, email=?, phone=?, address=?, city=?, state=?, zip=?, notes=?, vertical_id=?, sync_status='pending', updated_at=? WHERE id=?`,
    [merged.firstName, merged.lastName, merged.email ?? null, merged.phone ?? null,
     merged.address ?? null, merged.city ?? null, merged.state ?? null, merged.zip ?? null,
     merged.notes ?? null, merged.verticalId ?? null, merged.updatedAt, id]
  );
  return merged;
}

export function deleteCustomer(id: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db.runSync("UPDATE customers SET deleted_at=?, sync_status='pending', updated_at=? WHERE id=? AND deleted_at IS NULL", [now, now, id]);
  return result.changes > 0;
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
