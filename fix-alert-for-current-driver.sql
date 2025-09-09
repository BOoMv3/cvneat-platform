-- Diagnostic et correction pour les alertes de préparation
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier le livreur connecté (ID: 570c76ba-b097-4380-9fc0-244b366e24c2)
SELECT 
  'Livreur connecté' as info,
  id,
  email,
  role,
  created_at
FROM users 
WHERE id = '570c76ba-b097-4380-9fc0-244b366e24c2';

-- 2. Vérifier la commande #2000 actuelle
SELECT 
  'Commande #2000 actuelle' as info,
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

-- 3. Supprimer la commande #2000 et en créer une nouvelle pour le bon livreur
DELETE FROM orders WHERE id = 2000;

-- 4. Créer une nouvelle commande de test pour le livreur connecté
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
  2001, -- Nouvel ID
  'Client Test Alerte Final 2',
  '0123456789',
  '123 Rue de Test Alerte 2',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Alerte Final 2", "price": 25.00, "quantity": 1}]',
  25.00,
 3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  '570c76ba-b097-4380-9fc0-244b366e24c2', -- ID du livreur connecté
  3, -- 3 minutes de préparation seulement
  '888888',
  NOW() - INTERVAL '2 minutes', -- Commencée il y a 2 minutes sur 3
  NOW() - INTERVAL '2 minutes'
);

-- 5. Vérifier que la nouvelle commande a été créée
SELECT 
  'Nouvelle commande créée' as info,
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
WHERE id = 2001;

-- 6. Vérifier les commandes qui devraient déclencher une alerte
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
