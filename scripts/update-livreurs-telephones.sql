-- Script pour mettre à jour les numéros de téléphone des livreurs
-- À exécuter dans Supabase SQL Editor

-- 1. Mettre à jour theo@cvneat.fr : 0609981953
UPDATE users
SET telephone = '0609981953',
    updated_at = NOW()
WHERE email = 'theo@cvneat.fr'
  AND role = 'delivery';

-- 2. Mettre à jour justin@cvneat.fr : 0783175895
UPDATE users
SET telephone = '0783175895',
    updated_at = NOW()
WHERE email = 'justin@cvneat.fr'
  AND role = 'delivery';

-- 3. Mettre à jour youness@cvneat.fr : 0603913580
UPDATE users
SET telephone = '0603913580',
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

