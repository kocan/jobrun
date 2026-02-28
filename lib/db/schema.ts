// SQL schema for JobRun local-first database

export const SCHEMA_VERSION = 3;

export const MIGRATION_001 = `
-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  vertical_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_customers_sync ON customers(sync_status);
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT,
  estimated_duration INTEGER,
  address TEXT,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  photos TEXT NOT NULL DEFAULT '[]',
  estimate_id TEXT,
  invoice_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_sync ON jobs(sync_status);

-- Job line items
CREATE TABLE IF NOT EXISTS job_line_items (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL,
  service_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_job_li_job ON job_line_items(job_id);

-- Estimates
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  job_id TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  expires_at TEXT NOT NULL,
  share_token TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_estimates_customer ON estimates(customer_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_sync ON estimates(sync_status);

-- Estimate line items
CREATE TABLE IF NOT EXISTS estimate_line_items (
  id TEXT PRIMARY KEY NOT NULL,
  estimate_id TEXT NOT NULL,
  service_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_estimate_li_estimate ON estimate_line_items(estimate_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  job_id TEXT,
  estimate_id TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  payment_terms TEXT,
  due_date TEXT,
  paid_at TEXT,
  share_token TEXT,
  payments TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_sync ON invoices(sync_status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id TEXT PRIMARY KEY NOT NULL,
  invoice_id TEXT NOT NULL,
  service_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_invoice_li_invoice ON invoice_line_items(invoice_id);

-- Price book services
CREATE TABLE IF NOT EXISTS price_book_services (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL DEFAULT 0,
  estimated_duration INTEGER NOT NULL DEFAULT 60,
  category TEXT NOT NULL DEFAULT 'General',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pbs_sync ON price_book_services(sync_status);
CREATE INDEX IF NOT EXISTS idx_pbs_category ON price_book_services(category);

-- Settings (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- Invoice counter
CREATE TABLE IF NOT EXISTS invoice_counter (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_number INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO invoice_counter (id, next_number) VALUES (1, 1);
`;

export const MIGRATION_002 = `
-- Communication log for customer timeline
CREATE TABLE IF NOT EXISTS communication_log (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'note',
  summary TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comlog_customer ON communication_log(customer_id);
`;

export const MIGRATION_003 = `
-- Add reminder_sent flag to jobs for SMS appointment reminders
ALTER TABLE jobs ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0;
-- Customer notes for timeline
CREATE TABLE IF NOT EXISTS customer_notes (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
-- Add sync_retry_count to all syncable tables for exponential backoff tracking
ALTER TABLE customers ADD COLUMN sync_retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN sync_retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE estimates ADD COLUMN sync_retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN sync_retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE price_book_services ADD COLUMN sync_retry_count INTEGER NOT NULL DEFAULT 0;
`;
