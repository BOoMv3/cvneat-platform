-- Créer une commande de test pour le restaurant de restaurant@cvneat.com
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, vérifier l'ID du restaurant de restaurant@cvneat.com
SELECT 
  'Restaurant de restaurant@cvneat.com' as info,
  r.id,
  r.nom,
  r.adresse,
  r.user_id
FROM restaurants r
WHERE r.user_id = (
  SELECT id FROM users WHERE email = 'restaurant@cvneat.com'
);

-- 2. Créer une commande de test pour ce restaurant
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
  1000, -- Nouvel ID pour éviter les conflits
  'Client Test Restaurant',
  '0123456789',
  '123 Rue de Test',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Restaurant", "price": 20.00, "quantity": 1}]',
  20.00,
  3.00,
  'preparing',
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')),
  (SELECT id FROM users WHERE role = 'delivery' LIMIT 1),
  15,
  '999999',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes'
);

-- 3. Vérifier que la commande a été créée
SELECT 
  'Commande créée pour le bon restaurant' as info,
  o.id,
  o.customer_name,
  o.status,
  o.restaurant_id,
  o.preparation_time,
  o.created_at,
  o.updated_at,
  EXTRACT(EPOCH FROM (NOW() - o.updated_at))/60 as minutes_elapsed
FROM orders o
WHERE o.id = 1000;
