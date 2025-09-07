-- Script pour corriger les données de test
-- À exécuter dans Supabase SQL Editor

-- 1. Voir les commandes récentes et leurs clients
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Voir les utilisateurs disponibles
SELECT 
  id,
  email,
  full_name,
  role
FROM users 
WHERE role = 'customer'
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Mettre à jour la commande #54 pour qu'elle corresponde à un utilisateur existant
-- Remplacez 'Nom Utilisateur' par le nom d'un utilisateur existant
UPDATE orders 
SET customer_name = (
  SELECT full_name 
  FROM users 
  WHERE role = 'customer' 
  LIMIT 1
)
WHERE id = 54;

-- 4. Vérifier la mise à jour
SELECT 
  o.id,
  o.customer_name,
  u.full_name as user_name,
  o.status
FROM orders o
LEFT JOIN users u ON u.full_name = o.customer_name
WHERE o.id = 54;

-- 5. Si aucun utilisateur customer n'existe, créer un utilisateur de test
INSERT INTO users (id, email, full_name, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'client@test.com',
  'Client Test Alerte',
  'customer',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 6. Vérifier que la commande #54 a maintenant un client valide
SELECT 
  o.id,
  o.customer_name,
  u.full_name as user_name,
  u.email,
  o.status
FROM orders o
LEFT JOIN users u ON u.full_name = o.customer_name
WHERE o.id = 54;
