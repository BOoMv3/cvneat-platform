-- Créer un utilisateur client de test pour la commande #54
-- À exécuter dans Supabase SQL Editor

-- 1. Créer un utilisateur client de test
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'client.test@example.com',
  'Client Test Alerte',
  'customer',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 2. Vérifier que l'utilisateur a été créé
SELECT 
  id,
  email,
  full_name,
  role
FROM users 
WHERE email = 'client.test@example.com';

-- 3. Vérifier que la commande #54 correspond maintenant à un utilisateur
SELECT 
  o.id,
  o.customer_name,
  u.full_name as user_name,
  u.email,
  o.status
FROM orders o
LEFT JOIN users u ON u.full_name = o.customer_name
WHERE o.id = 54;

-- 4. Si vous voulez créer d'autres utilisateurs pour d'autres commandes
-- Remplacer 'Client Test' par le nom dans la commande
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'client.test2@example.com',
  'Client Test',
  'customer',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
