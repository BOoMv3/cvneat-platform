-- Script SQL pour ajouter les colonnes max_sauces et max_meats à la table menus
-- À exécuter dans Supabase SQL Editor

-- Ajouter les colonnes pour les limites de sauces et viandes
ALTER TABLE menus 
ADD COLUMN IF NOT EXISTS max_sauces INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_meats INTEGER DEFAULT NULL;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN menus.max_sauces IS 'Limite du nombre de sauces sélectionnables par le client (NULL = illimité)';
COMMENT ON COLUMN menus.max_meats IS 'Limite du nombre de viandes sélectionnables par le client (NULL = illimité)';

-- Index pour améliorer les performances (optionnel)
CREATE INDEX IF NOT EXISTS idx_menus_max_sauces ON menus(max_sauces) WHERE max_sauces IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menus_max_meats ON menus(max_meats) WHERE max_meats IS NOT NULL;

-- Vérification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'menus' 
  AND column_name IN ('max_sauces', 'max_meats')
ORDER BY column_name;

