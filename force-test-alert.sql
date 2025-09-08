-- Forcer une alerte de test
-- À exécuter dans Supabase SQL Editor

-- 1. Modifier la commande #999 pour qu'elle déclenche une alerte
UPDATE orders 
SET 
  updated_at = NOW() - INTERVAL '14 minutes' -- Commencée il y a 14 minutes sur 15
WHERE id = 999;

-- 2. Vérifier que la commande a été modifiée
SELECT 
  'Commande modifiée pour alerte' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id = 999;

-- 3. Vérifier les commandes qui devraient déclencher une alerte
SELECT 
  'Commandes avec alerte' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE status = 'preparing' 
  AND delivery_id IS NOT NULL
  AND preparation_time IS NOT NULL
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) <= 5
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) > 0;
