-- Créer une commande en contournant le problème
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier les utilisateurs existants
SELECT 
  'Utilisateurs disponibles' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
ORDER BY created_at DESC
LIMIT 5;

-- 2. Vérifier les restaurants existants
SELECT 
  'Restaurants disponibles' as info,
  id,
  nom,
  adresse
FROM restaurants 
LIMIT 3;

-- 3. Créer la commande avec un utilisateur existant (premier trouvé)
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
  999,
  'Client Test Alerte',
  '0123456789',
  '123 Rue de Test',
  'Paris',
  '75001',
  '[{"name": "Pizza Test", "price": 15.00, "quantity": 1}]',
  15.00,
  3.00,
  'preparing',
  (SELECT id FROM restaurants LIMIT 1),
  (SELECT id FROM users LIMIT 1), -- Premier utilisateur trouvé
  15,
  '123456',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes'
);

-- 4. Vérifier la commande créée
SELECT 
  'Commande créée' as info,
  id,
  customer_name,
  status,
  preparation_time,
  total_amount,
  delivery_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed
FROM orders 
WHERE id = 999;
