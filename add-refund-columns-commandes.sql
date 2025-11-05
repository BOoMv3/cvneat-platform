-- Ajouter les colonnes nécessaires pour le remboursement automatique dans la table commandes
-- À exécuter dans Supabase SQL Editor

-- Colonnes pour le remboursement
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP WITH TIME ZONE;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_commandes_stripe_refund_id ON commandes(stripe_refund_id);
CREATE INDEX IF NOT EXISTS idx_commandes_refunded_at ON commandes(refunded_at);

-- Commentaires
COMMENT ON COLUMN commandes.stripe_refund_id IS 'ID du remboursement Stripe associé à cette commande';
COMMENT ON COLUMN commandes.refund_amount IS 'Montant remboursé en euros';
COMMENT ON COLUMN commandes.refunded_at IS 'Date et heure du remboursement';

