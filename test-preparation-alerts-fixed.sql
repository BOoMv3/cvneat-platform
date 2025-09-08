-- Script corrigé pour tester les alertes de préparation
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, vérifier la structure de la table orders
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 2. Vérifier un ordre existant pour voir les vraies colonnes
SELECT * FROM orders LIMIT 1;

-- 3. Si la colonne s'appelle 'total' au lieu de 'total_price', utiliser ce script :
/*
INSERT INTO orders (
  id,
  customer_name,
  customer_phone,
  delivery_address,
  items,
  total,  -- Au lieu de total_price
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
  '123 Rue de Test, 75001 Paris',
  '[{"name": "Pizza Test", "price": 15.00, "quantity": 1}]',
  15.00,
  3.00,
  'preparing',
  (SELECT id FROM restaurants LIMIT 1),
  (SELECT id FROM users WHERE role = 'delivery' LIMIT 1),
  2,
  '123456',
  NOW() - INTERVAL '1 minute',
  NOW() - INTERVAL '1 minute'
) ON CONFLICT (id) DO UPDATE SET
  status = 'preparing',
  preparation_time = 2,
  updated_at = NOW() - INTERVAL '1 minute';
*/
