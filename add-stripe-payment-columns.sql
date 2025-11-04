-- Script pour ajouter les colonnes Stripe à la table commandes
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne payment_status si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- Ajouter la colonne stripe_payment_intent_id si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_commandes_stripe_payment_intent_id 
ON commandes(stripe_payment_intent_id);

-- Créer un index pour payment_status
CREATE INDEX IF NOT EXISTS idx_commandes_payment_status 
ON commandes(payment_status);

-- Commentaires pour la documentation
COMMENT ON COLUMN commandes.payment_status IS 'Statut du paiement Stripe: pending, paid, failed, cancelled, refunded';
COMMENT ON COLUMN commandes.stripe_payment_intent_id IS 'ID du PaymentIntent Stripe associé à cette commande';

