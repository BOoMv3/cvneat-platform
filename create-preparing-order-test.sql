-- Créer une commande en préparation pour tester le décompte
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer les anciennes commandes de test
DELETE FROM orders WHERE id IN (2009, 2010, 2011, 2012, 2013, 2014);

-- 2. Créer une commande en préparation avec un temps restant
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
  3001, -- Nouvel ID
  'Client Test Décompte',
  '0123456789',
  '123 Rue de Test Décompte',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Décompte", "price": 25.00, "quantity": 1}]',
  25.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  '570c76ba-b097-4380-9fc0-244b366e24c2', -- ID du livreur
  10, -- 10 minutes de préparation
  '777777',
  NOW() - INTERVAL '2 minutes', -- Commencée il y a 2 minutes sur 10 (donc 8 minutes restantes)
  NOW() - INTERVAL '2 minutes'
);

-- 3. Vérifier que la commande a été créée
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
WHERE id = 3001;

-- 4. Créer une autre commande avec moins de temps restant
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
  3002, -- Nouvel ID
  'Client Test Urgent',
  '0123456789',
  '456 Rue de Test Urgent',
  'Paris',
  '75001',
  '[{"name": "Burger Test Urgent", "price": 18.00, "quantity": 1}]',
  18.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  '570c76ba-b097-4380-9fc0-244b366e24c2', -- ID du livreur
  5, -- 5 minutes de préparation
  '888888',
  NOW() - INTERVAL '3 minutes', -- Commencée il y a 3 minutes sur 5 (donc 2 minutes restantes - URGENT)
  NOW() - INTERVAL '3 minutes'
);

-- 5. Vérifier la commande urgente
SELECT 
  'Commande urgente créée' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id = 3002;
