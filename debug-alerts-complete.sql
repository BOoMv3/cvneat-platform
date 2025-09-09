-- Diagnostic complet du système d'alertes
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier toutes les commandes en préparation
SELECT 
  'Toutes les commandes en préparation' as info,
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
  AND preparation_time IS NOT NULL;

-- 2. Vérifier les commandes qui devraient déclencher une alerte (moins de 5 min)
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

-- 3. Vérifier les commandes qui devraient déclencher une alerte (moins de 10 min)
SELECT 
  'Commandes avec alerte (moins de 10 min)' as info,
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
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) <= 10
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) > 0;

-- 4. Vérifier les restaurants
SELECT 
  'Restaurants' as info,
  id,
  nom,
  adresse
FROM restaurants;
