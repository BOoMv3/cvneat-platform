-- Script pour corriger les noms et prénoms des livreurs
-- À exécuter dans Supabase SQL Editor

-- 1. Mettre à jour theo@cvneat.fr : prénom = "theo", nom = "livreur"
UPDATE users
SET 
    prenom = 'theo',
    nom = 'livreur',
    updated_at = NOW()
WHERE email = 'theo@cvneat.fr'
  AND role = 'delivery';

-- 2. Mettre à jour youness@cvneat.fr : prénom = "youness", nom = "livreur"
UPDATE users
SET 
    prenom = 'youness',
    nom = 'livreur',
    updated_at = NOW()
WHERE email = 'youness@cvneat.fr'
  AND role = 'delivery';

-- Vérification des mises à jour
SELECT 
    id,
    email,
    nom,
    prenom,
    telephone,
    role,
    updated_at
FROM users
WHERE email IN ('theo@cvneat.fr', 'justin@cvneat.fr', 'youness@cvneat.fr')
ORDER BY email;

