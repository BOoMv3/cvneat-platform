-- Script pour corriger les noms et prénoms des livreurs
-- À exécuter dans Supabase SQL Editor après avoir vérifié les valeurs avec check-livreurs-noms.sql

-- REMPLACEZ les valeurs entre guillemets par les vrais noms et prénoms

-- 1. Mettre à jour theo@cvneat.fr
-- REMPLACEZ 'Théo' par le vrai prénom et 'Nom' par le vrai nom
UPDATE users
SET 
    prenom = 'Théo',  -- <<< REMPLACEZ PAR LE VRAI PRÉNOM
    nom = 'Nom',      -- <<< REMPLACEZ PAR LE VRAI NOM
    updated_at = NOW()
WHERE email = 'theo@cvneat.fr'
  AND role = 'delivery';

-- 2. Mettre à jour youness@cvneat.fr
-- REMPLACEZ 'Youness' par le vrai prénom et 'Nom' par le vrai nom
UPDATE users
SET 
    prenom = 'Youness',  -- <<< REMPLACEZ PAR LE VRAI PRÉNOM
    nom = 'Nom',         -- <<< REMPLACEZ PAR LE VRAI NOM
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

