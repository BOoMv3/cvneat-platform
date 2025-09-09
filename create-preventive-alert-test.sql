-- Créer des commandes de test pour les alertes préventives
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer toutes les anciennes commandes de test
DELETE FROM orders WHERE id IN (2009, 2010, 2011, 2012, 2013, 2014, 3001, 3002, 4001, 4002, 5001);

-- 2. Créer une commande en préparation avec 15 minutes (pour test)
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
  6001, -- ID simple
  'Client Test Alerte Préventive',
  '0123456789',
  '123 Rue de Test Alerte Préventive',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Alerte Préventive", "price": 25.00, "quantity": 1}]',
  25.00,
  4.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  NULL, -- PAS de delivery_id - le livreur n'a pas encore accepté
  15, -- 15 minutes de préparation
  '111111', -- Code simple
  NOW() - INTERVAL '2 minutes', -- Commencée il y a 2 minutes sur 15 (donc 13 minutes restantes)
  NOW() - INTERVAL '2 minutes'
);

-- 3. Créer une commande en préparation avec 5 minutes (urgente)
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
  6002, -- ID simple
  'Client Test Alerte Urgente',
  '0123456789',
  '456 Rue de Test Alerte Urgente',
  'Paris',
  '75001',
  '[{"name": "Burger Test Alerte Urgente", "price": 18.00, "quantity": 1}]',
  18.00,
  3.50,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  NULL, -- PAS de delivery_id - le livreur n'a pas encore accepté
  5, -- 5 minutes de préparation
  '222222', -- Code simple
  NOW() - INTERVAL '3 minutes', -- Commencée il y a 3 minutes sur 5 (donc 2 minutes restantes - URGENT)
  NOW() - INTERVAL '3 minutes'
);

-- 4. Vérifier que les commandes ont été créées
SELECT 
  'Commandes créées avec succès' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  security_code,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id IN (6001, 6002)
ORDER BY id;
