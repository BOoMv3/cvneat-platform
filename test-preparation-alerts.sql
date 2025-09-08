-- Script pour tester les alertes de préparation
-- À exécuter dans Supabase SQL Editor

-- 1. Créer une commande en préparation avec un temps court pour tester
INSERT INTO orders (
  id,
  customer_name,
  customer_phone,
  delivery_address,
  items,
  total_price,
  delivery_fee,
  status,
  restaurant_id,
  delivery_id,
  preparation_time,
  security_code,
  created_at,
  updated_at
) VALUES (
  999, -- ID de test
  'Client Test Alerte',
  '0123456789',
  '123 Rue de Test, 75001 Paris',
  '[{"name": "Pizza Test", "price": 15.00, "quantity": 1}]',
  15.00,
  3.00,
  'preparing',
  (SELECT id FROM restaurants LIMIT 1), -- Premier restaurant disponible
  (SELECT id FROM users WHERE role = 'delivery' LIMIT 1), -- Premier livreur disponible
  2, -- 2 minutes de préparation pour test rapide
  '123456',
  NOW() - INTERVAL '1 minute', -- Commencée il y a 1 minute
  NOW() - INTERVAL '1 minute'
) ON CONFLICT (id) DO UPDATE SET
  status = 'preparing',
  preparation_time = 2,
  updated_at = NOW() - INTERVAL '1 minute';

-- 2. Vérifier la commande créée
SELECT 
  id,
  customer_name,
  status,
  preparation_time,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed
FROM orders 
WHERE id = 999;

-- 3. Tester l'API d'alertes (à faire via l'interface)
-- GET /api/delivery/preparation-alerts
