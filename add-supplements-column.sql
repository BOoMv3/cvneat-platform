-- Script pour ajouter la colonne supplements à la table details_commande
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne supplements de type JSONB
ALTER TABLE details_commande
ADD COLUMN IF NOT EXISTS supplements JSONB;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN details_commande.supplements IS 'Stocke les suppléments sélectionnés pour cet article sous forme de tableau JSON : [{"nom": "Supplément", "prix": 2.50}]';

