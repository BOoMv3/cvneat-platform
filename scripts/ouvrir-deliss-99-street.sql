-- Ouvrir les restaurants ouverts manuellement / dans leur plage horaire
-- Deliss King, 99 Street Food, Smash Burger
-- Exécuter dans Supabase → SQL Editor

-- 1. État actuel
SELECT id, nom, ferme_manuellement, ouvert_manuellement
FROM restaurants
WHERE nom ILIKE '%deliss%' OR nom ILIKE '%99 street%' OR nom ILIKE '%99street%'
   OR nom ILIKE '%smash burger%' OR nom ILIKE '%smaash burger%';

-- 2. Ouvrir manuellement (ouvert_manuellement = true, ferme_manuellement = false)
UPDATE restaurants
SET ouvert_manuellement = true, ferme_manuellement = false, updated_at = NOW()
WHERE nom ILIKE '%deliss%' OR nom ILIKE '%99 street%' OR nom ILIKE '%99street%'
   OR nom ILIKE '%smash burger%' OR nom ILIKE '%smaash burger%';

-- 3. Vérification
SELECT id, nom, ferme_manuellement, ouvert_manuellement, updated_at
FROM restaurants
WHERE nom ILIKE '%deliss%' OR nom ILIKE '%99 street%' OR nom ILIKE '%99street%'
   OR nom ILIKE '%smash burger%' OR nom ILIKE '%smaash burger%';
