-- Créer la commande de test avec l'utilisateur valide
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer l'ancienne commande de test si elle existe
DELETE FROM orders WHERE id = 999;

-- 2. Créer la commande avec l'utilisateur valide
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
  '22222222-2222-2222-2222-222222222222', -- ID valide du livreur
  15,
  '123456',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes'
);

-- 3. Vérifier la commande créée
SELECT 
  'Commande créée avec succès' as info,
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

-- 4. Vérifier que le livreur existe toujours
SELECT 
  'Livreur vérifié' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE id = '22222222-2222-2222-2222-222222222222';
