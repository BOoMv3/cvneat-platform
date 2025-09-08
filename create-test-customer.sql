-- Créer un client de test complet
-- À exécuter dans Supabase SQL Editor

-- 1. Créer un utilisateur client de test
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
  'client.test@cvneat.com',
  'Dupont',
  'Jean',
  '06 12 34 56 78',
  '15 Rue de la Paix',
  '75001',
  'Paris',
  'user',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 2. Vérifier que l'utilisateur a été créé
SELECT 
  id,
  email,
  nom,
  prenom,
  telephone,
  adresse,
  code_postal,
  ville,
  role
FROM users 
WHERE email = 'client.test@cvneat.com';

-- 3. Créer un livreur de test
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
  'livreur.test@cvneat.com',
  'Martin',
  'Pierre',
  '06 98 76 54 32',
  '25 Avenue des Champs',
  '75008',
  'Paris',
  'delivery',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 4. Vérifier que le livreur a été créé
SELECT 
  id,
  email,
  nom,
  prenom,
  telephone,
  role
FROM users 
WHERE email = 'livreur.test@cvneat.com';
