-- Debug de la commande #55
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si la commande #55 existe
SELECT 
  id,
  customer_name,
  security_code,
  status,
  restaurant_id,
  created_at
FROM orders 
WHERE id = 55;

-- 2. Voir toutes les commandes avec ID 55 ou proche
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
WHERE id >= 54 AND id <= 56
ORDER BY id;

-- 3. Voir la dernière commande créée
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Vérifier s'il y a des commandes avec un ID différent
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
ORDER BY id DESC 
LIMIT 10;

-- 5. Vérifier la structure de la table orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
