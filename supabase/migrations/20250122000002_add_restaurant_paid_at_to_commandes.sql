-- Migration pour ajouter la colonne restaurant_paid_at à la table commandes
-- Cette colonne permet de savoir quand une commande a été payée au restaurant

ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS restaurant_paid_at TIMESTAMP WITH TIME ZONE;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_commandes_restaurant_paid_at ON commandes(restaurant_paid_at);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN commandes.restaurant_paid_at IS 'Date et heure à laquelle la commande a été payée au restaurant (virement effectué)';

