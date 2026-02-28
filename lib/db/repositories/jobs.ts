import { getDatabase } from '../database';
import { Job, JobStatus, LineItem, Photo } from '../../types';
import { JobLineItemRow, JobRow } from '../types';

function rowToJob(row: JobRow, lineItems: LineItem[]): Job {
  return {
    id: row.id,
    customerId: row.customer_id,
    title: row.title,
    description: row.description || undefined,
    status: row.status as JobStatus,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time || undefined,
    estimatedDuration: row.estimated_duration || undefined,
    address: row.address || undefined,
    lineItems,
    total: row.total,
    notes: row.notes || undefined,
    photos: JSON.parse(row.photos || '[]') as Photo[],
    estimateId: row.estimate_id || undefined,
    invoiceId: row.invoice_id || undefined,
    reminderSent: row.reminder_sent === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLineItem(row: JobLineItemRow): LineItem {
  return {
    id: row.id,
    serviceId: row.service_id || undefined,
    name: row.name,
    description: row.description || undefined,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    total: row.total,
  };
}

function getLineItemsForJob(db: ReturnType<typeof getDatabase>, jobId: string): LineItem[] {
  return db.getAllSync<JobLineItemRow>('SELECT * FROM job_line_items WHERE job_id = ? ORDER BY sort_order', [jobId]).map(rowToLineItem);
}

function getLineItemsForJobs(db: ReturnType<typeof getDatabase>, jobIds: string[]): Record<string, LineItem[]> {
  if (jobIds.length === 0) return {};
  const placeholders = jobIds.map(() => '?').join(', ');
  const rows = db.getAllSync<JobLineItemRow>(
    `SELECT * FROM job_line_items WHERE job_id IN (${placeholders}) ORDER BY job_id, sort_order`,
    jobIds
  );
  const grouped: Record<string, LineItem[]> = {};
  for (const row of rows) {
    if (!grouped[row.job_id]) grouped[row.job_id] = [];
    grouped[row.job_id].push(rowToLineItem(row));
  }
  return grouped;
}

function saveLineItems(db: ReturnType<typeof getDatabase>, jobId: string, lineItems: LineItem[]): void {
  db.runSync('DELETE FROM job_line_items WHERE job_id = ?', [jobId]);
  lineItems.forEach((li, i) => {
    db.runSync(
      'INSERT INTO job_line_items (id, job_id, service_id, name, description, quantity, unit_price, total, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [li.id, jobId, li.serviceId ?? null, li.name, li.description ?? null, li.quantity, li.unitPrice, li.total, i]
    );
  });
}

export function getJobs(): Job[] {
  const db = getDatabase();
  const rows = db.getAllSync<JobRow>('SELECT * FROM jobs WHERE deleted_at IS NULL ORDER BY scheduled_date DESC');
  const lineItemsByJobId = getLineItemsForJobs(db, rows.map((row) => row.id));
  return rows.map((row) => rowToJob(row, lineItemsByJobId[row.id] ?? []));
}

export function getJobById(id: string): Job | null {
  const db = getDatabase();
  const row = db.getFirstSync<JobRow>('SELECT * FROM jobs WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!row) return null;
  return rowToJob(row, getLineItemsForJob(db, id));
}

export function addJob(job: Job): Job {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO jobs (id, customer_id, title, description, status, scheduled_date, scheduled_time, estimated_duration, address, total, notes, photos, estimate_id, invoice_id, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [job.id, job.customerId, job.title, job.description ?? null, job.status, job.scheduledDate,
       job.scheduledTime ?? null, job.estimatedDuration ?? null, job.address ?? null, job.total,
       job.notes ?? null, JSON.stringify(job.photos), job.estimateId ?? null, job.invoiceId ?? null,
       job.createdAt, job.updatedAt]
    );
    saveLineItems(db, job.id, job.lineItems);
  });
  return job;
}

export function updateJob(id: string, updates: Partial<Job>): Job | null {
  const db = getDatabase();
  const existing = getJobById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE jobs SET customer_id=?, title=?, description=?, status=?, scheduled_date=?, scheduled_time=?, estimated_duration=?, address=?, total=?, notes=?, photos=?, estimate_id=?, invoice_id=?, sync_status='pending', updated_at=? WHERE id=?`,
      [merged.customerId, merged.title, merged.description ?? null, merged.status, merged.scheduledDate,
       merged.scheduledTime ?? null, merged.estimatedDuration ?? null, merged.address ?? null, merged.total,
       merged.notes ?? null, JSON.stringify(merged.photos), merged.estimateId ?? null, merged.invoiceId ?? null,
       merged.updatedAt, id]
    );
    saveLineItems(db, id, merged.lineItems);
  });
  return merged;
}

export function deleteJob(id: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db.runSync("UPDATE jobs SET deleted_at=?, sync_status='pending', updated_at=? WHERE id=? AND deleted_at IS NULL", [now, now, id]);
  return result.changes > 0;
}

export function markReminderSent(id: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const result = db.runSync(
    "UPDATE jobs SET reminder_sent=1, sync_status='pending', updated_at=? WHERE id=? AND deleted_at IS NULL",
    [now, id]
  );
  return result.changes > 0;
}

export function getJobsForReminderDate(date: string): Job[] {
  const db = getDatabase();
  const rows = db.getAllSync<JobRow>(
    "SELECT * FROM jobs WHERE scheduled_date = ? AND status = 'scheduled' AND reminder_sent = 0 AND deleted_at IS NULL ORDER BY scheduled_time",
    [date]
  );
  const lineItemsByJobId = getLineItemsForJobs(db, rows.map((row) => row.id));
  return rows.map((row) => rowToJob(row, lineItemsByJobId[row.id] ?? []));
}

export function filterJobsByCustomer(jobs: Job[], customerId: string): Job[] {
  return jobs.filter((j) => j.customerId === customerId);
}

export function filterJobsByStatus(jobs: Job[], status: JobStatus): Job[] {
  return jobs.filter((j) => j.status === status);
}

export function filterJobsByDate(jobs: Job[], date: string): Job[] {
  return jobs.filter((j) => j.scheduledDate === date);
}

export function isValidStatusTransition(from: JobStatus, to: JobStatus): boolean {
  const transitions: Record<JobStatus, JobStatus[]> = {
    'scheduled': ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'cancelled'],
    'completed': [],
    'cancelled': ['scheduled'],
  };
  return transitions[from]?.includes(to) ?? false;
}
