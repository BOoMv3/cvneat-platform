-- Diagnostic des contraintes de clé étrangère
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier les contraintes de la table orders
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass;

-- 2. Vérifier la structure de la table orders
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('delivery_id', 'restaurant_id')
ORDER BY ordinal_position;

-- 3. Vérifier si la table users existe et a des données
SELECT 
  'Table users existe' as info,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_name = 'users';

-- 4. Vérifier les utilisateurs existants
SELECT 
  'Utilisateurs existants' as info,
  COUNT(*) as count
FROM users;

-- 5. Vérifier les restaurants existants
SELECT 
  'Restaurants existants' as info,
  COUNT(*) as count
FROM restaurants;

-- 6. Essayer de créer un utilisateur simple
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
  '22222222-2222-2222-2222-222222222222',
  'test.user@example.com',
  'Test',
  'User',
  '0123456789',
  '123 Rue Test',
  '75001',
  'Paris',
  'user',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 7. Vérifier que l'utilisateur a été créé
SELECT 
  'Utilisateur créé' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE id = '22222222-2222-2222-2222-222222222222';
