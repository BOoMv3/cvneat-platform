-- Script SQL pour ajouter le champ ferme_manuellement à la table restaurants
-- À exécuter dans Supabase SQL Editor

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS ferme_manuellement BOOLEAN DEFAULT FALSE;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_restaurants_ferme_manuellement ON restaurants(ferme_manuellement);

