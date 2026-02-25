import { getDatabase } from '../database';
import { Invoice, InvoiceStatus, LineItem, Payment } from '../../types';
import { InvoiceLineItemRow, InvoiceRow } from '../types';

function rowToLineItem(row: InvoiceLineItemRow): LineItem {
  return { id: row.id, serviceId: row.service_id || undefined, name: row.name, description: row.description || undefined, quantity: row.quantity, unitPrice: row.unit_price, total: row.total };
}

function rowToInvoice(row: InvoiceRow, lineItems: LineItem[]): Invoice {
  return {
    id: row.id, invoiceNumber: row.invoice_number, customerId: row.customer_id,
    jobId: row.job_id || undefined, estimateId: row.estimate_id || undefined, lineItems,
    subtotal: row.subtotal, taxRate: row.tax_rate, taxAmount: row.tax_amount, total: row.total,
    status: row.status as InvoiceStatus, paymentTerms: row.payment_terms || undefined,
    dueDate: row.due_date || undefined, paidAt: row.paid_at || undefined,
    shareToken: row.share_token || undefined,
    payments: JSON.parse(row.payments || '[]') as Payment[],
    notes: row.notes || undefined, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function getLineItems(db: ReturnType<typeof getDatabase>, invoiceId: string): LineItem[] {
  return db.getAllSync<InvoiceLineItemRow>('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY sort_order', [invoiceId]).map(rowToLineItem);
}

function getLineItemsForInvoices(db: ReturnType<typeof getDatabase>, invoiceIds: string[]): Record<string, LineItem[]> {
  if (invoiceIds.length === 0) return {};
  const placeholders = invoiceIds.map(() => '?').join(', ');
  const rows = db.getAllSync<InvoiceLineItemRow>(
    `SELECT * FROM invoice_line_items WHERE invoice_id IN (${placeholders}) ORDER BY invoice_id, sort_order`,
    invoiceIds
  );
  const grouped: Record<string, LineItem[]> = {};
  for (const row of rows) {
    if (!grouped[row.invoice_id]) grouped[row.invoice_id] = [];
    grouped[row.invoice_id].push(rowToLineItem(row));
  }
  return grouped;
}

function saveLineItems(db: ReturnType<typeof getDatabase>, invoiceId: string, lineItems: LineItem[]): void {
  db.runSync('DELETE FROM invoice_line_items WHERE invoice_id = ?', [invoiceId]);
  lineItems.forEach((li, i) => {
    db.runSync('INSERT INTO invoice_line_items (id, invoice_id, service_id, name, description, quantity, unit_price, total, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
      [li.id, invoiceId, li.serviceId ?? null, li.name, li.description ?? null, li.quantity, li.unitPrice, li.total, i]);
  });
}

export function getInvoices(): Invoice[] {
  const db = getDatabase();
  const rows = db.getAllSync<InvoiceRow>('SELECT * FROM invoices WHERE deleted_at IS NULL ORDER BY created_at DESC');
  const lineItemsByInvoiceId = getLineItemsForInvoices(db, rows.map((r) => r.id));
  return rows.map((r) => rowToInvoice(r, lineItemsByInvoiceId[r.id] ?? []));
}

export function getInvoiceById(id: string): Invoice | null {
  const db = getDatabase();
  const row = db.getFirstSync<InvoiceRow>('SELECT * FROM invoices WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!row) return null;
  return rowToInvoice(row, getLineItems(db, id));
}

export function getNextInvoiceNumber(): string {
  const db = getDatabase();
  let next = 1;
  db.withTransactionSync(() => {
    const row = db.getFirstSync<{ next_number: number }>('SELECT next_number FROM invoice_counter WHERE id = 1');
    next = row ? row.next_number : 1;
    db.runSync('UPDATE invoice_counter SET next_number = ? WHERE id = 1', [next + 1]);
  });
  return `INV-${String(next).padStart(4, '0')}`;
}

export function addInvoice(invoice: Invoice): Invoice {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO invoices (id, invoice_number, customer_id, job_id, estimate_id, subtotal, tax_rate, tax_amount, total, status, payment_terms, due_date, paid_at, share_token, payments, notes, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
      [invoice.id, invoice.invoiceNumber, invoice.customerId, invoice.jobId ?? null, invoice.estimateId ?? null,
       invoice.subtotal, invoice.taxRate, invoice.taxAmount, invoice.total, invoice.status,
       invoice.paymentTerms ?? null, invoice.dueDate ?? null, invoice.paidAt ?? null, invoice.shareToken ?? null,
       JSON.stringify(invoice.payments), invoice.notes ?? null, invoice.createdAt, invoice.updatedAt]
    );
    saveLineItems(db, invoice.id, invoice.lineItems);
  });
  return invoice;
}

export function updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
  const db = getDatabase();
  const existing = getInvoiceById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE invoices SET invoice_number=?, customer_id=?, job_id=?, estimate_id=?, subtotal=?, tax_rate=?, tax_amount=?, total=?, status=?, payment_terms=?, due_date=?, paid_at=?, share_token=?, payments=?, notes=?, sync_status='pending', updated_at=? WHERE id=?`,
      [merged.invoiceNumber, merged.customerId, merged.jobId ?? null, merged.estimateId ?? null,
       merged.subtotal, merged.taxRate, merged.taxAmount, merged.total, merged.status,
       merged.paymentTerms ?? null, merged.dueDate ?? null, merged.paidAt ?? null, merged.shareToken ?? null,
       JSON.stringify(merged.payments), merged.notes ?? null, merged.updatedAt, id]
    );
    saveLineItems(db, id, merged.lineItems);
  });
  return merged;
}

export function deleteInvoice(id: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db.runSync("UPDATE invoices SET deleted_at=?, sync_status='pending', updated_at=? WHERE id=? AND deleted_at IS NULL", [now, now, id]);
  return result.changes > 0;
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
    'draft': ['sent', 'cancelled'], 'sent': ['viewed', 'paid', 'overdue', 'cancelled'],
    'viewed': ['paid', 'overdue', 'cancelled'], 'paid': [], 'overdue': ['paid', 'cancelled'], 'cancelled': ['draft'],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function calculateInvoiceTotals(lineItems: { unitPrice: number; quantity: number }[], taxRate: number) {
  const subtotal = Math.round(lineItems.reduce((sum, li) => sum + li.unitPrice * li.quantity, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}
