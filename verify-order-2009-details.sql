-- Vérifier les détails de la commande #2009
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier que la commande #2009 existe
SELECT 
  'Commande #2009' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  restaurant_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id = 2009;

-- 2. Vérifier tous les delivery_id des commandes en préparation
SELECT 
  'Tous les delivery_id des commandes en préparation' as info,
  id,
  customer_name,
  delivery_id,
  status,
  preparation_time
FROM orders 
WHERE status = 'preparing' 
  AND preparation_time IS NOT NULL
ORDER BY id DESC;

-- 3. Vérifier les utilisateurs avec le rôle 'delivery'
SELECT 
  'Utilisateurs avec rôle delivery' as info,
  id,
  email,
  role
FROM users 
WHERE role = 'delivery';
