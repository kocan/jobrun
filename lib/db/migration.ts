import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from './database';
import { Customer, Job, Estimate, Invoice, PriceBookService } from '../types';
import { AppSettings, defaultSettings } from '../db/repositories/settings';

const MIGRATION_DONE_KEY = '@jobrun_sqlite_migrated';

/**
 * Migrate existing AsyncStorage data into SQLite on first launch.
 * Idempotent — checks a flag to avoid re-running.
 */
export async function migrateFromAsyncStorage(): Promise<boolean> {
  const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
  if (done === 'true') return false;

  const db = getDatabase();
  let migrated = false;

  // Customers
  const customersJson = await AsyncStorage.getItem('@jobrun_customers');
  if (customersJson) {
    const customers: Customer[] = JSON.parse(customersJson);
    db.withTransactionSync(() => {
      for (const c of customers) {
        db.runSync(
          `INSERT OR IGNORE INTO customers (id, first_name, last_name, email, phone, address, city, state, zip, notes, vertical_id, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
          [c.id, c.firstName, c.lastName, c.email ?? null, c.phone ?? null, c.address ?? null, c.city ?? null, c.state ?? null, c.zip ?? null, c.notes ?? null, c.verticalId ?? null, c.createdAt, c.updatedAt]
        );
      }
    });
    migrated = true;
  }

  // Jobs
  const jobsJson = await AsyncStorage.getItem('@jobrun_jobs');
  if (jobsJson) {
    const jobs: Job[] = JSON.parse(jobsJson);
    db.withTransactionSync(() => {
      for (const j of jobs) {
        db.runSync(
          `INSERT OR IGNORE INTO jobs (id, customer_id, title, description, status, scheduled_date, scheduled_time, estimated_duration, address, total, notes, photos, estimate_id, invoice_id, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
          [j.id, j.customerId, j.title, j.description ?? null, j.status, j.scheduledDate, j.scheduledTime ?? null, j.estimatedDuration ?? null, j.address ?? null, j.total, j.notes ?? null, JSON.stringify(j.photos), j.estimateId ?? null, j.invoiceId ?? null, j.createdAt, j.updatedAt]
        );
        for (let i = 0; i < j.lineItems.length; i++) {
          const li = j.lineItems[i];
          db.runSync('INSERT OR IGNORE INTO job_line_items (id, job_id, service_id, name, description, quantity, unit_price, total, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
            [li.id, j.id, li.serviceId ?? null, li.name, li.description ?? null, li.quantity, li.unitPrice, li.total, i]);
        }
      }
    });
    migrated = true;
  }

  // Estimates
  const estimatesJson = await AsyncStorage.getItem('@jobrun_estimates');
  if (estimatesJson) {
    const estimates: Estimate[] = JSON.parse(estimatesJson);
    db.withTransactionSync(() => {
      for (const e of estimates) {
        db.runSync(
          `INSERT OR IGNORE INTO estimates (id, customer_id, job_id, subtotal, tax_rate, tax_amount, total, status, notes, expires_at, share_token, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
          [e.id, e.customerId, e.jobId ?? null, e.subtotal, e.taxRate, e.taxAmount, e.total, e.status, e.notes ?? null, e.expiresAt, e.shareToken ?? null, e.createdAt, e.updatedAt]
        );
        for (let i = 0; i < e.lineItems.length; i++) {
          const li = e.lineItems[i];
          db.runSync('INSERT OR IGNORE INTO estimate_line_items (id, estimate_id, service_id, name, description, quantity, unit_price, total, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
            [li.id, e.id, li.serviceId ?? null, li.name, li.description ?? null, li.quantity, li.unitPrice, li.total, i]);
        }
      }
    });
    migrated = true;
  }

  // Invoices
  const invoicesJson = await AsyncStorage.getItem('@jobrun_invoices');
  if (invoicesJson) {
    const invoices: Invoice[] = JSON.parse(invoicesJson);
    db.withTransactionSync(() => {
      for (const inv of invoices) {
        db.runSync(
          `INSERT OR IGNORE INTO invoices (id, invoice_number, customer_id, job_id, estimate_id, subtotal, tax_rate, tax_amount, total, status, payment_terms, due_date, paid_at, share_token, payments, notes, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?)`,
          [inv.id, inv.invoiceNumber, inv.customerId, inv.jobId ?? null, inv.estimateId ?? null, inv.subtotal, inv.taxRate, inv.taxAmount, inv.total, inv.status, inv.paymentTerms ?? null, inv.dueDate ?? null, inv.paidAt ?? null, inv.shareToken ?? null, JSON.stringify(inv.payments), inv.notes ?? null, inv.createdAt, inv.updatedAt]
        );
        for (let i = 0; i < inv.lineItems.length; i++) {
          const li = inv.lineItems[i];
          db.runSync('INSERT OR IGNORE INTO invoice_line_items (id, invoice_id, service_id, name, description, quantity, unit_price, total, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
            [li.id, inv.id, li.serviceId ?? null, li.name, li.description ?? null, li.quantity, li.unitPrice, li.total, i]);
        }
      }
    });
    migrated = true;
  }

  // Invoice counter
  const counterJson = await AsyncStorage.getItem('@jobrun_invoice_counter');
  if (counterJson) {
    const next = parseInt(counterJson, 10) + 1;
    db.runSync('UPDATE invoice_counter SET next_number = ? WHERE id = 1', [next]);
    migrated = true;
  }

  // Price book
  const pbJson = await AsyncStorage.getItem('@jobrun_pricebook');
  if (pbJson) {
    const services: PriceBookService[] = JSON.parse(pbJson);
    db.withTransactionSync(() => {
      for (const s of services) {
        db.runSync(
          `INSERT OR IGNORE INTO price_book_services (id, name, description, price, estimated_duration, category, is_active, sort_order, sync_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,'pending',?,?)`,
          [s.id, s.name, s.description ?? null, s.price, s.estimatedDuration, s.category, s.isActive ? 1 : 0, s.sortOrder, s.createdAt, s.updatedAt]
        );
      }
    });
    migrated = true;
  }

  // Settings
  const settingsJson = await AsyncStorage.getItem('@jobrun_settings');
  if (settingsJson) {
    const settings: AppSettings = { ...defaultSettings, ...JSON.parse(settingsJson) };
    const entries: [string, string][] = [
      ['app_selectedVertical', settings.selectedVertical ?? ''],
      ['app_businessName', settings.businessName],
      ['app_businessPhone', settings.businessPhone],
      ['app_businessEmail', settings.businessEmail],
      ['app_onboardingComplete', String(settings.onboardingComplete)],
    ];
    db.withTransactionSync(() => {
      for (const [key, value] of entries) {
        db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
      }
    });
    migrated = true;
  }

  // Mark migration as done
  await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
  return migrated;
}
