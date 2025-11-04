-- Script pour ajouter les colonnes Stripe à la table advertisements
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne stripe_payment_intent_id si elle n'existe pas
ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- Ajouter la colonne payment_status si elle n'existe pas
ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- Ajouter la colonne status si elle n'existe pas (pour l'approbation admin)
ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_approval' 
CHECK (status IN ('pending_approval', 'approved', 'rejected', 'active', 'expired'));

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_advertisements_stripe_payment_intent_id 
ON advertisements(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_advertisements_payment_status 
ON advertisements(payment_status);

CREATE INDEX IF NOT EXISTS idx_advertisements_status 
ON advertisements(status);

-- Commentaires pour la documentation
COMMENT ON COLUMN advertisements.stripe_payment_intent_id IS 'ID du PaymentIntent Stripe associé à cette publicité';
COMMENT ON COLUMN advertisements.payment_status IS 'Statut du paiement Stripe: pending, paid, failed, cancelled, refunded';
COMMENT ON COLUMN advertisements.status IS 'Statut de la publicité: pending_approval, approved, rejected, active, expired';

