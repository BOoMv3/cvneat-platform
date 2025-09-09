-- Créer une commande de test avec 5 minutes de préparation
-- À exécuter dans Supabase SQL Editor

-- 1. Créer une commande de test avec un temps restant valide
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
  2008, -- Nouvel ID
  'Client Test Alerte 5 Min',
  '0123456789',
  '123 Rue de Test 5 Min',
  'Paris',
  '75001',
  '[{"name": "Pizza Test 5 Min", "price": 30.00, "quantity": 1}]',
  30.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  '570c76ba-b097-4380-9fc0-244b366e24c2', -- ID du livreur connecté
  5, -- 5 minutes de préparation
  '000000',
  NOW() - INTERVAL '2 minutes', -- Commencée il y a 2 minutes sur 5 (donc 3 minutes restantes)
  NOW() - INTERVAL '2 minutes'
)
ON CONFLICT (id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  status = EXCLUDED.status,
  preparation_time = EXCLUDED.preparation_time,
  delivery_id = EXCLUDED.delivery_id,
  updated_at = EXCLUDED.updated_at;

-- 2. Vérifier que la commande a été créée
SELECT 
  'Commande créée avec succès' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id = 2008;

-- 3. Vérifier les commandes qui devraient déclencher une alerte
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
  AND delivery_id = '570c76ba-b097-4380-9fc0-244b366e24c2'
  AND preparation_time IS NOT NULL
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) <= 5
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) > 0;
