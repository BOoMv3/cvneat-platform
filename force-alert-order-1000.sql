-- Forcer une alerte immédiate pour la commande #1000
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'état actuel de la commande #1000
SELECT 
  'État actuel de la commande #1000' as info,
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed
FROM orders 
WHERE id = 1000;

-- 2. Modifier la commande pour qu'elle déclenche une alerte immédiate
UPDATE orders 
SET 
  status = 'preparing',
  preparation_time = 15,
  updated_at = NOW() - INTERVAL '14 minutes' -- Commencée il y a 14 minutes sur 15
WHERE id = 1000;

-- 3. Vérifier que la modification a fonctionné
SELECT 
  'Commande #1000 modifiée pour alerte' as info,
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id = 1000;

-- 4. Vérifier les commandes qui devraient déclencher une alerte
SELECT 
  'Commandes avec alerte (moins de 5 min)' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE status = 'preparing' 
  AND delivery_id IS NOT NULL
  AND preparation_time IS NOT NULL
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) <= 5
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) > 0;
