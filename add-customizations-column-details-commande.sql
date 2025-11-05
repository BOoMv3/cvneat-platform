-- Script SQL pour ajouter la colonne customizations à la table details_commande
-- Permet de stocker les choix de viande, sauces et ingrédients retirés

-- Ajouter la colonne customizations de type JSONB
ALTER TABLE details_commande 
ADD COLUMN IF NOT EXISTS customizations JSONB DEFAULT '{}'::jsonb;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN details_commande.customizations IS 'Stocke les customizations du client : viandes sélectionnées, sauces sélectionnées, ingrédients retirés. Format: {"selectedMeats": [...], "selectedSauces": [...], "removedIngredients": [...]}';

-- Index pour améliorer les performances des requêtes sur les customizations
CREATE INDEX IF NOT EXISTS idx_details_commande_customizations ON details_commande USING GIN (customizations);

