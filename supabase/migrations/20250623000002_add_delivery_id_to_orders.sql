-- Add delivery_id column to commandes table
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES auth.users(id);

-- Add frais_livraison column to commandes table if it doesn't exist
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS frais_livraison DECIMAL(10,2) DEFAULT 2.50;

-- Add montant_total column to commandes table if it doesn't exist
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS montant_total DECIMAL(10,2) DEFAULT 0.00; 