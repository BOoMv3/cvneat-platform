-- Script de diagnostic complet pour créer une commande de test
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier tous les utilisateurs disponibles
SELECT 
  'Tous les utilisateurs' as type,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
ORDER BY created_at DESC;

-- 2. Vérifier spécifiquement les livreurs
SELECT 
  'Livreurs uniquement' as type,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE role = 'delivery';

-- 3. Vérifier les restaurants
SELECT 
  'Restaurants uniquement' as type,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE role = 'restaurant';

-- 4. Si aucun livreur n'existe, créer un livreur de test
INSERT INTO users (
  id,
  email,
  nom,
  prenom,
  telephone,
  adresse,
  code_postal,
  ville,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'livreur.test@example.com',
  'Livreur',
  'Test',
  '0123456789',
  '123 Rue du Test',
  '75001',
  'Paris',
  'delivery',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 5. Maintenant créer la commande avec un utilisateur valide
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
  (SELECT id FROM users WHERE role = 'delivery' LIMIT 1),
  15,
  '123456',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes'
) ON CONFLICT (id) DO UPDATE SET
  status = 'preparing',
  preparation_time = 15,
  updated_at = NOW() - INTERVAL '10 minutes';

-- 6. Vérifier la commande créée
SELECT 
  'Commande créée' as type,
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
