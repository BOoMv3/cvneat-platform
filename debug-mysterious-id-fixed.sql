-- Diagnostic de l'ID mystérieux
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si cet ID existe dans la table users
SELECT 
  'Recherche ID mystérieux' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE id = '943f3d9b-52ef-41d6-b232-84e6d27ccc80';

-- 2. Vérifier tous les utilisateurs avec rôle delivery
SELECT 
  'Tous les livreurs' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE role = 'delivery';

-- 3. Vérifier les commandes existantes avec cet ID
SELECT 
  'Commandes avec cet ID' as info,
  id,
  customer_name,
  status,
  delivery_id
FROM orders 
WHERE delivery_id = '943f3d9b-52ef-41d6-b232-84e6d27ccc80';

-- 4. Vérifier les contraintes de clé étrangère
SELECT 
  'Contraintes FK' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname LIKE '%delivery%';

-- 5. Essayer de créer un utilisateur avec cet ID exact
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
  '943f3d9b-52ef-41d6-b232-84e6d27ccc80',
  'livreur.mystere@example.com',
  'Livreur',
  'Mystère',
  '0123456789',
  '123 Rue Mystère',
  '75001',
  'Paris',
  'delivery',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nom = EXCLUDED.nom,
  prenom = EXCLUDED.prenom,
  role = EXCLUDED.role;

-- 6. Vérifier que l'utilisateur a été créé
SELECT 
  'Utilisateur mystère créé' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE id = '943f3d9b-52ef-41d6-b232-84e6d27ccc80';
