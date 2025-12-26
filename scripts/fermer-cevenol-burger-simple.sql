-- Script SQL SIMPLE pour fermer le restaurant "Le Cévenol Burger"
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Vérifier le restaurant avant fermeture
SELECT 
    id,
    nom,
    email,
    telephone,
    ferme_manuellement,
    status
FROM restaurants
WHERE nom ILIKE '%cévenol%burger%'
   OR nom ILIKE '%cevenol%burger%'
   OR nom ILIKE '%cévenol burger%'
   OR nom ILIKE '%cevenol burger%';

-- ÉTAPE 2: Fermer le restaurant (mettre ferme_manuellement = true)
UPDATE restaurants
SET 
    ferme_manuellement = true,
    updated_at = NOW()
WHERE nom ILIKE '%cévenol%burger%'
   OR nom ILIKE '%cevenol%burger%'
   OR nom ILIKE '%cévenol burger%'
   OR nom ILIKE '%cevenol burger%';

-- ÉTAPE 3: Vérifier le résultat
SELECT 
    id,
    nom,
    ferme_manuellement,
    updated_at
FROM restaurants
WHERE nom ILIKE '%cévenol%burger%'
   OR nom ILIKE '%cevenol%burger%'
   OR nom ILIKE '%cévenol burger%'
   OR nom ILIKE '%cevenol burger%';

