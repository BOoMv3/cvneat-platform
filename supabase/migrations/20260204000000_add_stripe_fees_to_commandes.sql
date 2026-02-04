-- Store Stripe processing fees per order (gross vs net)
-- This prevents confusing "CA" numbers vs bank balance.

ALTER TABLE commandes
ADD COLUMN IF NOT EXISTS stripe_fee_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS stripe_net_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS stripe_currency TEXT,
ADD COLUMN IF NOT EXISTS stripe_available_on TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_balance_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT;

