-- Script de test sécurisé pour les alertes de préparation
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, vérifier la contrainte sur preparation_time
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname LIKE '%preparation%';

-- 2. Vérifier les valeurs existantes de preparation_time
SELECT 
  preparation_time,
  COUNT(*) as count
FROM orders 
WHERE preparation_time IS NOT NULL
GROUP BY preparation_time
ORDER BY preparation_time;

-- 3. Essayer avec une valeur plus réaliste (probablement entre 10 et 60 minutes)
INSERT INTO orders (
  id,
  customer_name,
  customer_phone,
  delivery_address,
  delivery_city,
  delivery_postal_code,
  items,
  total_amount,
  delivery_fee,
  status,
  restaurant_id,
  delivery_id,
  preparation_time,
  security_code,
  created_at,
  updated_at
) VALUES (
  999,
  'Client Test Alerte',
  '0123456789',
  '123 Rue de Test',
  'Paris',
  '75001',
  '[{"name": "Pizza Test", "price": 15.00, "quantity": 1}]',
  15.00,
  3.00,
  'preparing',
  (SELECT id FROM restaurants LIMIT 1),
  (SELECT id FROM users WHERE role = 'delivery' LIMIT 1),
  15, -- 15 minutes au lieu de 2
  '123456',
  NOW() - INTERVAL '10 minutes', -- Commencée il y a 10 minutes
  NOW() - INTERVAL '10 minutes'
) ON CONFLICT (id) DO UPDATE SET
  status = 'preparing',
  preparation_time = 15,
  updated_at = NOW() - INTERVAL '10 minutes';

-- 4. Vérifier la commande créée
SELECT 
  id,
  customer_name,
  status,
  preparation_time,
  total_amount,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed
FROM orders 
WHERE id = 999;
