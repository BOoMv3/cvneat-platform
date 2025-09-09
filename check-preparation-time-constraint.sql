-- Vérifier la contrainte check_preparation_time
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier les contraintes de la table orders
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname = 'check_preparation_time';

-- 2. Vérifier les valeurs de preparation_time existantes
SELECT 
  'Valeurs preparation_time existantes' as info,
  preparation_time,
  COUNT(*) as count
FROM orders 
WHERE preparation_time IS NOT NULL
GROUP BY preparation_time
ORDER BY preparation_time;