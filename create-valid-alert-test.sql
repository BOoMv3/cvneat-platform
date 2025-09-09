-- Créer une commande de test avec des valeurs valides pour preparation_time
-- À exécuter dans Supabase SQL Editor

-- 1. D'abord, supprimer les anciennes commandes de test
DELETE FROM orders WHERE id IN (2000, 2001);

-- 2. Créer une commande de test avec preparation_time = 15 minutes (valeur réaliste)
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
  2002, -- Nouvel ID
  'Client Test Alerte Final 3',
  '0123456789',
  '123 Rue de Test Alerte 3',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Alerte Final 3", "price": 20.00, "quantity": 1}]',
  20.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  '570c76ba-b097-4380-9fc0-244b366e24c2', -- ID du livreur connecté
  15, -- 15 minutes de préparation (valeur réaliste)
  '999999',
  NOW() - INTERVAL '12 minutes', -- Commencée il y a 12 minutes sur 15
  NOW() - INTERVAL '12 minutes'
);

-- 3. Vérifier que la commande a été créée
SELECT 
  'Commande créée avec succès' as info,
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
WHERE id = 2002;

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
  AND delivery_id = '570c76ba-b097-4380-9fc0-244b366e24c2' -- Spécifiquement pour ce livreur
  AND preparation_time IS NOT NULL
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) <= 5
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) > 0;
