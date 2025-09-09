-- Créer une commande d'alerte avec le delivery_id correct
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer l'ancienne commande #2009
DELETE FROM orders WHERE id = 2009;

-- 2. Créer une nouvelle commande avec le delivery_id du livreur connecté
-- Remplacez 'DELIVERY_ID_DU_TOKEN' par le delivery_id que vous avez trouvé dans la console
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
  2010, -- Nouvel ID
  'Client Test Alerte Final 2',
  '0123456789',
  '123 Rue de Test Final 2',
  'Paris',
  '75001',
  '[{"name": "Pizza Test Final 2", "price": 35.00, "quantity": 1}]',
  35.00,
  3.00,
  'preparing', -- Statut en préparation
  (SELECT r.id FROM restaurants r WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')), -- Restaurant de restaurant@cvneat.com
  '570c76ba-b097-4380-9fc0-244b366e24c2', -- ID du livreur (à remplacer par le bon)
  5, -- 5 minutes de préparation
  '222222',
  NOW() - INTERVAL '2 minutes', -- Commencée il y a 2 minutes sur 5 (donc 3 minutes restantes)
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
WHERE id = 2010;
