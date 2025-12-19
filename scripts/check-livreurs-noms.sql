-- Script pour vérifier les noms et prénoms des livreurs
-- À exécuter dans Supabase SQL Editor

SELECT 
    id,
    email,
    nom,
    prenom,
    telephone,
    role,
    created_at,
    updated_at
FROM users
WHERE email IN ('theo@cvneat.fr', 'justin@cvneat.fr', 'youness@cvneat.fr')
ORDER BY email;

