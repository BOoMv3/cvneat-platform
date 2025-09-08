-- Script pour tester l'API des alertes de préparation
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la commande de test #999
SELECT 
  'Commande de test #999' as info,
  id,
  customer_name,
  status,
  preparation_time,
  total_amount,
  delivery_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed
FROM orders 
WHERE id = 999;

-- 2. Modifier la commande pour qu'elle déclenche une alerte (moins de 5 min restantes)
UPDATE orders 
SET 
  updated_at = NOW() - INTERVAL '12 minutes' -- Commencée il y a 12 minutes
WHERE id = 999;

-- 3. Vérifier que la commande a été modifiée
SELECT 
  'Commande modifiée' as info,
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

-- 4. Vérifier les commandes qui devraient déclencher une alerte
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
