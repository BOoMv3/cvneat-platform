-- Script pour ajouter les colonnes d'images manquantes à la table restaurants

-- 1. Ajouter la colonne pour la bannière du restaurant
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS banner_image TEXT;

-- 2. Ajouter la colonne pour le logo du restaurant
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS logo_image TEXT;

-- 3. Ajouter la colonne pour l'image de profil du restaurant
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- 4. Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND column_name IN ('image_url', 'banner_image', 'logo_image', 'profile_image')
ORDER BY column_name;

-- 5. Mettre à jour le Restaurant Test avec des images par défaut (optionnel)
UPDATE restaurants 
SET 
  banner_image = image_url,
  logo_image = image_url,
  profile_image = image_url
WHERE nom = 'Restaurant Test'; 