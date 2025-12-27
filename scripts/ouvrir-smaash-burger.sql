-- Script SQL pour ouvrir le restaurant Smaash Burger
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Vérifier le restaurant avant ouverture
SELECT 
    id,
    nom,
    email,
    telephone,
    ferme_manuellement,
    status
FROM restaurants
WHERE nom ILIKE '%smaash%burger%'
   OR nom ILIKE '%smash%burger%';

-- ÉTAPE 2: Ouvrir le restaurant (mettre ferme_manuellement = false)
UPDATE restaurants
SET 
    ferme_manuellement = false,
    updated_at = NOW()
WHERE nom ILIKE '%smaash%burger%'
   OR nom ILIKE '%smash%burger%';

-- ÉTAPE 3: Vérifier le résultat
SELECT 
    id,
    nom,
    ferme_manuellement,
    updated_at
FROM restaurants
WHERE nom ILIKE '%smaash%burger%'
   OR nom ILIKE '%smash%burger%';

