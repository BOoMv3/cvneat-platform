-- Créer une commande de test simple pour vérifier le décompte
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer toutes les anciennes commandes de test
DELETE FROM orders WHERE id IN (2009, 2010, 2011, 2012, 2013, 2014, 3001, 3002, 4001, 4002);

-- 2. Créer une commande simple en préparation
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
  5001, -- ID simple
  'Client Test Simple',
  '0123456789',
  '123 Rue de Test Simple',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Simple", "price": 20.00, "quantity": 1}]',
  20.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  NULL, -- PAS de delivery_id - le livreur n'a pas encore accepté
  5, -- 5 minutes de préparation
  '123456', -- Code simple
  NOW() - INTERVAL '1 minute', -- Commencée il y a 1 minute sur 5 (donc 4 minutes restantes)
  NOW() - INTERVAL '1 minute'
);

-- 3. Vérifier que la commande a été créée
SELECT 
  'Commande créée avec succès' as info,
  id,
  customer_name,
  status,
  preparation_time,
  delivery_id,
  security_code,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id = 5001;