-- Stripe Connect accounts for operators
-- Stores the connection between user accounts and their Stripe Connect accounts

CREATE TABLE IF NOT EXISTS stripe_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up by user_id (most common query)
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user_id ON stripe_accounts(user_id);

-- Index for looking up by stripe_account_id (for webhooks)
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON stripe_accounts(stripe_account_id);

-- Row Level Security
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own Stripe account
CREATE POLICY "Users can view own stripe account"
  ON stripe_accounts
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own Stripe account
CREATE POLICY "Users can insert own stripe account"
  ON stripe_accounts
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own Stripe account
CREATE POLICY "Users can update own stripe account"
  ON stripe_accounts
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stripe_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER stripe_accounts_updated_at
  BEFORE UPDATE ON stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_accounts_updated_at();
