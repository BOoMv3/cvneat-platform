-- Vérifier le statut de la commande #1000
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la commande #1000
SELECT 
  'Commande #1000' as info,
  id,
  customer_name,
  status,
  preparation_time,
  total_amount,
  delivery_id,
  restaurant_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id = 1000;

-- 2. Vérifier si elle devrait déclencher une alerte (moins de 5 min restantes)
SELECT 
  'Commande #1000 - Alerte' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining,
  CASE 
    WHEN (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) <= 5 
         AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) > 0 
    THEN 'ALERTE DÉCLENCHÉE' 
    ELSE 'Pas d\'alerte' 
  END as alerte_status
FROM orders 
WHERE id = 1000;
