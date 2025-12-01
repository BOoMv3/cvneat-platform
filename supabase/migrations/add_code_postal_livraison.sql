-- Migration pour ajouter la colonne code_postal_livraison à la table commandes
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne code_postal_livraison si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS code_postal_livraison VARCHAR(10);

-- Ajouter aussi ville_livraison si elle n'existe pas (utilisée dans le code)
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS ville_livraison VARCHAR(255);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN commandes.code_postal_livraison IS 'Code postal de l''adresse de livraison';
COMMENT ON COLUMN commandes.ville_livraison IS 'Ville de l''adresse de livraison';

-- Vérifier que les colonnes ont été ajoutées
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
  AND column_name IN ('code_postal_livraison', 'ville_livraison')
ORDER BY column_name;

