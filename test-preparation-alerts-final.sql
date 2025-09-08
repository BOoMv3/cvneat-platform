-- Script final pour tester les alertes de préparation
-- À exécuter dans Supabase SQL Editor

-- 1. Créer une commande en préparation avec un temps réaliste
INSERT INTO orders (
  id,
  customer_name,
  customer_phone,
  delivery_address,
  delivery_city,
  delivery_postal_code,
  items,
  total_amount,  -- Corrigé : total_amount au lieu de total_price
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
  15, -- 15 minutes (valeur réaliste)
  '123456',
  NOW() - INTERVAL '10 minutes', -- Commencée il y a 10 minutes
  NOW() - INTERVAL '10 minutes'
) ON CONFLICT (id) DO UPDATE SET
  status = 'preparing',
  preparation_time = 15,
  updated_at = NOW() - INTERVAL '10 minutes';

-- 2. Vérifier la commande créée
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
