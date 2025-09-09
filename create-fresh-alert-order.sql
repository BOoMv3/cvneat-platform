-- Créer une commande de test avec un temps restant valide pour déclencher une alerte
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer l'ancienne commande #2002
DELETE FROM orders WHERE id = 2002;

-- 2. Créer une nouvelle commande de test avec un temps restant valide
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
  2003, -- Nouvel ID
  'Client Test Alerte Final 4',
  '0123456789',
  '123 Rue de Test Alerte 4',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Alerte Final 4", "price": 25.00, "quantity": 1}]',
  25.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  '570c76ba-b097-4380-9fc0-244b366e24c2', -- ID du livreur connecté
  10, -- 10 minutes de préparation
  '555555',
  NOW() - INTERVAL '6 minutes', -- Commencée il y a 6 minutes sur 10 (donc 4 minutes restantes)
  NOW() - INTERVAL '6 minutes'
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
WHERE id = 2003;

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
