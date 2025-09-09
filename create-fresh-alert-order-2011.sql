-- Créer une commande d'alerte fraîche qui fonctionne vraiment
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer l'ancienne commande #2010
DELETE FROM orders WHERE id = 2010;

-- 2. Créer une nouvelle commande avec un temps restant valide
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
  2011, -- Nouvel ID
  'Client Test Alerte Fraîche',
  '0123456789',
  '123 Rue de Test Fraîche',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Fraîche", "price": 35.00, "quantity": 1}]',
  35.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  '570c76ba-b097-4380-9fc0-244b366e24c2', -- ID du livreur connecté
  5, -- 5 minutes de préparation
  '333333',
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
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE id = 2011;

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
  AND delivery_id = '570c76ba-b097-4380-9fc0-244b366e24c2'
  AND preparation_time IS NOT NULL
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) <= 5
  AND (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) > 0;
