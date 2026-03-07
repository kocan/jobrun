-- Migration: QB tokens and bookings tables
-- Issue #169: Migrate QB tokens and bookings from filesystem to Supabase
-- Replaces ephemeral data/*.json files with persistent database storage

-- QB Tokens table - stores QuickBooks OAuth tokens per owner
CREATE TABLE IF NOT EXISTS qb_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  realm_id TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

-- QB Sync Log table - tracks synced invoices/payments to QuickBooks
CREATE TABLE IF NOT EXISTS qb_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL,
  qb_invoice_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT NOT NULL CHECK (type IN ('invoice', 'payment'))
);

-- Bookings table - customer booking requests
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service_type TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE qb_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE qb_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qb_tokens: only owner can access their tokens
CREATE POLICY "Users can view own QB tokens"
  ON qb_tokens FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own QB tokens"
  ON qb_tokens FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own QB tokens"
  ON qb_tokens FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own QB tokens"
  ON qb_tokens FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for qb_sync_log: only owner can access their sync logs
CREATE POLICY "Users can view own QB sync logs"
  ON qb_sync_log FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own QB sync logs"
  ON qb_sync_log FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own QB sync logs"
  ON qb_sync_log FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for bookings:
-- - Public can INSERT (customers submitting booking requests)
-- - Only operator can SELECT/UPDATE/DELETE their bookings

CREATE POLICY "Anyone can create booking requests"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Operators can view their bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = operator_id);

CREATE POLICY "Operators can update their bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = operator_id)
  WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Operators can delete their bookings"
  ON bookings FOR DELETE
  USING (auth.uid() = operator_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qb_tokens_owner ON qb_tokens(owner_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_owner ON qb_sync_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_invoice ON qb_sync_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_bookings_operator ON bookings(operator_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Trigger to update updated_at on qb_tokens
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_qb_tokens_updated_at
  BEFORE UPDATE ON qb_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
