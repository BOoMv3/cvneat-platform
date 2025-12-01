-- SCRIPT POUR AJOUTER LA COLONNE code_postal_livraison À LA TABLE COMMANDES
-- À exécuter dans Supabase SQL Editor
-- 
-- Ce script corrige l'erreur: "Could not find the 'code_postal_livraison' column of 'commandes' in the schema cache"
-- IMPORTANT: Après l'exécution, attendez 1-2 minutes pour que le cache PostgREST se rafraîchisse

-- 1. Vérifier si la colonne existe déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'commandes' 
    AND column_name = 'code_postal_livraison'
  ) THEN
    ALTER TABLE commandes ADD COLUMN code_postal_livraison VARCHAR(10);
    RAISE NOTICE 'Colonne code_postal_livraison ajoutée';
  ELSE
    RAISE NOTICE 'Colonne code_postal_livraison existe déjà';
  END IF;
END $$;

-- 2. Ajouter aussi ville_livraison si elle n'existe pas (utilisée dans le code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'commandes' 
    AND column_name = 'ville_livraison'
  ) THEN
    ALTER TABLE commandes ADD COLUMN ville_livraison VARCHAR(255);
    RAISE NOTICE 'Colonne ville_livraison ajoutée';
  ELSE
    RAISE NOTICE 'Colonne ville_livraison existe déjà';
  END IF;
END $$;

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

-- 5. Forcer le rafraîchissement du cache PostgREST (nécessite les permissions admin)
-- Note: Cette commande peut ne pas fonctionner selon vos permissions
-- Si elle échoue, attendez simplement 1-2 minutes après l'exécution du script
NOTIFY pgrst, 'reload schema';

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

