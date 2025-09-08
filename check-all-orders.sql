-- Vérifier toutes les commandes existantes
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

-- 3. Voir les 10 dernières commandes créées
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Voir les commandes avec ID 50-60
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
WHERE id BETWEEN 50 AND 60
ORDER BY id;

-- 5. Voir la structure de la table orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
