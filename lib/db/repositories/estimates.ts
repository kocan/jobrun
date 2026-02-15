import { getDatabase } from '../database';
import { Estimate, EstimateStatus, LineItem } from '../../types';

function rowToLineItem(row: any): LineItem {
  return { id: row.id, serviceId: row.service_id || undefined, name: row.name, description: row.description || undefined, quantity: row.quantity, unitPrice: row.unit_price, total: row.total };
}

function rowToEstimate(row: any, lineItems: LineItem[]): Estimate {
  return {
    id: row.id, customerId: row.customer_id, jobId: row.job_id || undefined, lineItems,
    subtotal: row.subtotal, taxRate: row.tax_rate, taxAmount: row.tax_amount, total: row.total,
    status: row.status as EstimateStatus, notes: row.notes || undefined, expiresAt: row.expires_at,
    shareToken: row.share_token || undefined, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function getLineItems(db: ReturnType<typeof getDatabase>, estimateId: string): LineItem[] {
  return db.getAllSync('SELECT * FROM estimate_line_items WHERE estimate_id = ? ORDER BY sort_order', [estimateId]).map(rowToLineItem);
}

function saveLineItems(db: ReturnType<typeof getDatabase>, estimateId: string, lineItems: LineItem[]): void {
  db.runSync('DELETE FROM estimate_line_items WHERE estimate_id = ?', [estimateId]);
  lineItems.forEach((li, i) => {
    db.runSync('INSERT INTO estimate_line_items (id, estimate_id, service_id, name, description, quantity, unit_price, total, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
      [li.id, estimateId, li.serviceId ?? null, li.name, li.description ?? null, li.quantity, li.unitPrice, li.total, i]);
  });
}

export function getEstimates(): Estimate[] {
  const db = getDatabase();
  const rows = db.getAllSync('SELECT * FROM estimates WHERE deleted_at IS NULL ORDER BY created_at DESC');
  return rows.map((r: any) => rowToEstimate(r, getLineItems(db, r.id)));
}

export function getEstimateById(id: string): Estimate | null {
  const db = getDatabase();
  const row = db.getFirstSync('SELECT * FROM estimates WHERE id = ? AND deleted_at IS NULL', [id]) as any;
  if (!row) return null;
  return rowToEstimate(row, getLineItems(db, id));
}

export function addEstimate(estimate: Estimate): Estimate {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO estimates (id, customer_id, job_id, subtotal, tax_rate, tax_amount, total, status, notes, expires_at, share_token, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
      [estimate.id, estimate.customerId, estimate.jobId ?? null, estimate.subtotal, estimate.taxRate, estimate.taxAmount, estimate.total, estimate.status, estimate.notes ?? null, estimate.expiresAt, estimate.shareToken ?? null, estimate.createdAt, estimate.updatedAt]
    );
    saveLineItems(db, estimate.id, estimate.lineItems);
  });
  return estimate;
}

export function updateEstimate(id: string, updates: Partial<Estimate>): Estimate | null {
  const db = getDatabase();
  const existing = getEstimateById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE estimates SET customer_id=?, job_id=?, subtotal=?, tax_rate=?, tax_amount=?, total=?, status=?, notes=?, expires_at=?, share_token=?, sync_status='pending', updated_at=? WHERE id=?`,
      [merged.customerId, merged.jobId ?? null, merged.subtotal, merged.taxRate, merged.taxAmount, merged.total, merged.status, merged.notes ?? null, merged.expiresAt, merged.shareToken ?? null, merged.updatedAt, id]
    );
    saveLineItems(db, id, merged.lineItems);
  });
  return merged;
}

export function deleteEstimate(id: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db.runSync("UPDATE estimates SET deleted_at=?, sync_status='pending', updated_at=? WHERE id=? AND deleted_at IS NULL", [now, now, id]);
  return result.changes > 0;
}

export function filterEstimatesByCustomer(estimates: Estimate[], customerId: string): Estimate[] {
  return estimates.filter((e) => e.customerId === customerId);
}

export function filterEstimatesByStatus(estimates: Estimate[], status: EstimateStatus): Estimate[] {
  return estimates.filter((e) => e.status === status);
}

export function isValidEstimateStatusTransition(from: EstimateStatus, to: EstimateStatus): boolean {
  const transitions: Record<EstimateStatus, EstimateStatus[]> = {
    'draft': ['sent'], 'sent': ['accepted', 'declined', 'expired'], 'viewed': ['accepted', 'declined', 'expired'],
    'accepted': [], 'declined': ['draft'], 'expired': ['draft'],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function calculateEstimateTotals(lineItems: { unitPrice: number; quantity: number }[], taxRate: number) {
  const subtotal = Math.round(lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}
