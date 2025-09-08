-- Vérifier la contrainte sur preparation_time
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier les contraintes de la table orders
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname LIKE '%preparation%';

-- 2. Vérifier la structure de la colonne preparation_time
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'preparation_time';

-- 3. Vérifier les valeurs existantes de preparation_time
SELECT 
  preparation_time,
  COUNT(*) as count
FROM orders 
WHERE preparation_time IS NOT NULL
GROUP BY preparation_time
ORDER BY preparation_time;
