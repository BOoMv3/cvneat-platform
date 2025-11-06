-- Script SQL pour ajouter la colonne rejection_reason à la table commandes
-- Cette colonne stocke la raison du refus de commande par le restaurant

ALTER TABLE commandes
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN commandes.rejection_reason IS 'Raison du refus de la commande par le restaurant (communiquée au client)';

