-- Créer une commande de test qui déclenchera vraiment une alerte
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, supprimer les anciennes commandes de test
DELETE FROM orders WHERE id IN (999, 1000, 1001);

-- 2. Créer une commande de test qui déclenchera une alerte immédiate
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
  2000, -- Nouvel ID
  'Client Test Alerte Final',
  '0123456789',
  '123 Rue de Test Alerte',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Alerte Final", "price": 30.00, "quantity": 1}]',
  30.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  (SELECT id FROM users WHERE role = 'delivery' LIMIT 1), -- Assigner un livreur
  5, -- 5 minutes de préparation seulement
  '777777',
  NOW() - INTERVAL '4 minutes', -- Commencée il y a 4 minutes sur 5
  NOW() - INTERVAL '4 minutes'
);

-- 3. Vérifier que la commande a été créée
SELECT 
  'Commande de test créée' as info,
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
WHERE id = 2000;

-- 4. Vérifier les commandes qui devraient déclencher une alerte
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
