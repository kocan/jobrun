-- Initial JobRun database schema
-- Generated from lib/db/schema.ts for version control

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  sync_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_date TEXT,
  scheduled_time TEXT,
  estimated_duration INTEGER,
  amount REAL,
  address TEXT,
  notes TEXT,
  sync_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Estimates
CREATE TABLE IF NOT EXISTS estimates (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total REAL DEFAULT 0,
  notes TEXT,
  sync_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'draft',
  total REAL DEFAULT 0,
  due_date TEXT,
  notes TEXT,
  sync_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Price Book Services
CREATE TABLE IF NOT EXISTS price_book_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_price REAL DEFAULT 0,
  category TEXT,
  sync_status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Line Items (shared for estimates and invoices)
CREATE TABLE IF NOT EXISTS line_items (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  parent_type TEXT NOT NULL, -- 'estimate' or 'invoice'
  service_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price REAL DEFAULT 0,
  total REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
