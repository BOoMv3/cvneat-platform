-- Créer une commande en préparation SANS livreur assigné
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer les anciennes commandes de test
DELETE FROM orders WHERE id IN (2009, 2010, 2011, 2012, 2013, 2014, 3001, 3002);

-- 2. Créer une commande en préparation SANS delivery_id (pour que le restaurant puisse la voir)
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
  4001, -- Nouvel ID
  'Client Test Décompte Correct',
  '0123456789',
  '123 Rue de Test Décompte Correct',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Décompte Correct", "price": 25.00, "quantity": 1}]',
  25.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  NULL, -- PAS de delivery_id - le livreur n'a pas encore accepté
  10, -- 10 minutes de préparation
  '999999',
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
WHERE id = 4001;

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
  4002, -- Nouvel ID
  'Client Test Urgent Correct',
  '0123456789',
  '456 Rue de Test Urgent Correct',
  'Paris',
  '75001',
  '[{"name": "Burger Test Urgent Correct", "price": 18.00, "quantity": 1}]',
  18.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  NULL, -- PAS de delivery_id - le livreur n'a pas encore accepté
  5, -- 5 minutes de préparation
  '000000',
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
WHERE id = 4002;
