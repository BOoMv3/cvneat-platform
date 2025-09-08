-- Diagnostic de l'API des alertes de préparation
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

-- 2. Vérifier les commandes en statut "preparing" avec delivery_id
SELECT 
  'Commandes en préparation' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed
FROM orders 
WHERE status = 'preparing' 
  AND delivery_id IS NOT NULL
  AND preparation_time IS NOT NULL;

-- 3. Vérifier les commandes qui devraient déclencher une alerte (moins de 5 min restantes)
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

-- 4. Vérifier les restaurants pour la jointure
SELECT 
  'Restaurants disponibles' as info,
  id,
  nom,
  adresse
FROM restaurants 
LIMIT 3;

-- 5. Vérifier les utilisateurs pour la jointure
SELECT 
  'Utilisateurs disponibles' as info,
  id,
  nom,
  prenom,
  role
FROM users 
WHERE role = 'delivery'
LIMIT 3;
