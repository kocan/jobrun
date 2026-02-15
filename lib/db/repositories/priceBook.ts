import { getDatabase } from '../database';
import { PriceBookService, DefaultServiceTemplate } from '../../types';

function rowToService(row: any): PriceBookService {
  return {
    id: row.id, name: row.name, description: row.description || undefined,
    price: row.price, estimatedDuration: row.estimated_duration, category: row.category,
    isActive: row.is_active === 1, sortOrder: row.sort_order,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function getServices(): PriceBookService[] {
  const db = getDatabase();
  return db.getAllSync('SELECT * FROM price_book_services WHERE deleted_at IS NULL ORDER BY sort_order').map(rowToService);
}

export function addService(service: PriceBookService): PriceBookService {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO price_book_services (id, name, description, price, estimated_duration, category, is_active, sort_order, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,'pending',?,?)`,
    [service.id, service.name, service.description ?? null, service.price, service.estimatedDuration, service.category, service.isActive ? 1 : 0, service.sortOrder, service.createdAt, service.updatedAt]
  );
  return service;
}

export function updateService(id: string, updates: Partial<PriceBookService>): PriceBookService | null {
  const db = getDatabase();
  const row = db.getFirstSync('SELECT * FROM price_book_services WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!row) return null;
  const existing = rowToService(row);
  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  db.runSync(
    `UPDATE price_book_services SET name=?, description=?, price=?, estimated_duration=?, category=?, is_active=?, sort_order=?, sync_status='pending', updated_at=? WHERE id=?`,
    [merged.name, merged.description ?? null, merged.price, merged.estimatedDuration, merged.category, merged.isActive ? 1 : 0, merged.sortOrder, merged.updatedAt, id]
  );
  return merged;
}

export function deleteService(id: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db.runSync("UPDATE price_book_services SET deleted_at=?, sync_status='pending', updated_at=? WHERE id=? AND deleted_at IS NULL", [now, now, id]);
  return result.changes > 0;
}

export function saveServices(services: PriceBookService[]): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    // Soft-delete all existing
    db.runSync("UPDATE price_book_services SET deleted_at = datetime('now') WHERE deleted_at IS NULL");
    for (const s of services) {
      db.runSync(
        `INSERT OR REPLACE INTO price_book_services (id, name, description, price, estimated_duration, category, is_active, sort_order, sync_status, created_at, updated_at, deleted_at) VALUES (?,?,?,?,?,?,?,?,'pending',?,?,NULL)`,
        [s.id, s.name, s.description ?? null, s.price, s.estimatedDuration, s.category, s.isActive ? 1 : 0, s.sortOrder, s.createdAt, s.updatedAt]
      );
    }
  });
}

export function reorderServices(orderedIds: string[]): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    orderedIds.forEach((id, i) => {
      db.runSync('UPDATE price_book_services SET sort_order = ? WHERE id = ?', [i, id]);
    });
  });
}

export function buildServicesFromDefaults(defaults: DefaultServiceTemplate[], generateId: () => string): PriceBookService[] {
  const now = new Date().toISOString();
  return defaults.map((d, i) => ({
    id: generateId(), name: d.name, description: d.description, price: d.price,
    estimatedDuration: d.estimatedDuration ?? 60, category: d.category ?? 'General',
    isActive: true, sortOrder: i, createdAt: now, updatedAt: now,
  }));
}

export function getServicesByCategory(services: PriceBookService[]): Record<string, PriceBookService[]> {
  const grouped: Record<string, PriceBookService[]> = {};
  for (const s of services) {
    const cat = s.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }
  for (const cat of Object.keys(grouped)) grouped[cat].sort((a, b) => a.sortOrder - b.sortOrder);
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
