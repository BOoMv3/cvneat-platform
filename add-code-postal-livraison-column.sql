-- SCRIPT POUR AJOUTER LA COLONNE code_postal_livraison À LA TABLE COMMANDES
-- À exécuter dans Supabase SQL Editor
-- 
-- Ce script corrige l'erreur: "Could not find the 'code_postal_livraison' column of 'commandes' in the schema cache"

-- 1. Ajouter la colonne code_postal_livraison si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS code_postal_livraison VARCHAR(10);

-- 2. Ajouter aussi ville_livraison si elle n'existe pas (utilisée dans le code)
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS ville_livraison VARCHAR(255);

-- 3. Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN commandes.code_postal_livraison IS 'Code postal de l''adresse de livraison';
COMMENT ON COLUMN commandes.ville_livraison IS 'Ville de l''adresse de livraison';

-- 4. Vérifier que les colonnes ont été ajoutées
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

-- 5. Si vous voulez mettre à jour les commandes existantes avec le code postal extrait de l'adresse
-- (Optionnel - décommentez si nécessaire)
/*
UPDATE commandes 
SET code_postal_livraison = (
  SELECT regexp_match(adresse_livraison, '\b(\d{5})\b')[1]
  WHERE regexp_match(adresse_livraison, '\b(\d{5})\b') IS NOT NULL
)
WHERE code_postal_livraison IS NULL 
  AND adresse_livraison IS NOT NULL;
*/

