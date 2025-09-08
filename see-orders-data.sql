-- Voir les données des commandes
-- À exécuter dans Supabase SQL Editor

-- 1. Voir toutes les commandes avec leur ID
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
ORDER BY id DESC;

-- 2. Voir le nombre total de commandes
SELECT COUNT(*) as total_orders FROM orders;

-- 3. Voir les 5 dernières commandes créées
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
