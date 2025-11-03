-- Script SQL pour ajouter la colonne supplements à la table menus
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne supplements de type JSONB pour stocker un tableau de suppléments
ALTER TABLE menus
ADD COLUMN IF NOT EXISTS supplements JSONB DEFAULT '[]'::jsonb;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN menus.supplements IS 'Tableau JSON des suppléments disponibles pour ce plat. Format: [{"nom": "string", "prix": number, "id": number}]';

-- Exemple de structure attendue:
-- [
--   {"id": 1234567890, "nom": "Extra fromage", "prix": 2.50},
--   {"id": 1234567891, "nom": "Bacon", "prix": 3.00}
-- ]

