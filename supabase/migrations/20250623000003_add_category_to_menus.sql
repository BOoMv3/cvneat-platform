-- Migration pour ajouter la colonne category à la table menus
ALTER TABLE menus ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Mettre à jour les plats existants avec des catégories par défaut
UPDATE menus SET category = 'Plats principaux' WHERE category IS NULL; 