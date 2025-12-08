-- Migration pour ajouter la colonne picked_up_at à la table commandes
-- Cette colonne permet de savoir quand le livreur a récupéré la commande au restaurant

ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_commandes_picked_up_at ON commandes(picked_up_at);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN commandes.picked_up_at IS 'Date et heure à laquelle le livreur a récupéré la commande au restaurant';

