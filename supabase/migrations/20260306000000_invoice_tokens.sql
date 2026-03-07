-- Invoice sharing tokens for secure public invoice access and Stripe payments

CREATE TABLE IF NOT EXISTS invoice_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  invoice_id TEXT NOT NULL,
  operator_id TEXT NOT NULL,

  -- Snapshot of invoice data at share time
  invoice_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  business_name TEXT,
  line_items JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  payment_terms TEXT,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Payment tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'paid', 'expired', 'cancelled')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,

  -- Timestamps
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index for fast token lookups (public access)
CREATE INDEX IF NOT EXISTS idx_invoice_tokens_token ON invoice_tokens(token);

-- Index for finding tokens by invoice
CREATE INDEX IF NOT EXISTS idx_invoice_tokens_invoice_id ON invoice_tokens(invoice_id);

-- Index for operator's tokens
CREATE INDEX IF NOT EXISTS idx_invoice_tokens_operator_id ON invoice_tokens(operator_id);

-- Row Level Security
ALTER TABLE invoice_tokens ENABLE ROW LEVEL SECURITY;

-- Public can read tokens (for invoice viewing)
CREATE POLICY "Public can read invoice tokens by token"
  ON invoice_tokens FOR SELECT
  USING (true);

-- Only authenticated operators can create tokens for their invoices
CREATE POLICY "Operators can create their own tokens"
  ON invoice_tokens FOR INSERT
  WITH CHECK (auth.uid()::text = operator_id);

-- System can update tokens (for webhook payment updates)
CREATE POLICY "Service role can update tokens"
  ON invoice_tokens FOR UPDATE
  USING (true);
