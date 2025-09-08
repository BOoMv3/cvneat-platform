-- Diagnostic complet du problème
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si l'utilisateur existe vraiment
SELECT 
  'Vérification utilisateur' as info,
  id,
  email,
  nom,
  prenom,
  role,
  created_at
FROM users 
WHERE id = '943f3d9b-52ef-41d6-b232-84e6d27ccc80';

-- 2. Vérifier tous les utilisateurs
SELECT 
  'Tous les utilisateurs' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier les contraintes de clé étrangère
SELECT 
  'Contraintes FK' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'orders'::regclass 
  AND conname LIKE '%delivery%';

-- 4. Vérifier la structure de la table orders
SELECT 
  'Structure table orders' as info,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'delivery_id';

-- 5. Essayer de créer un utilisateur simple
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
  '99999999-9999-9999-9999-999999999999',
  'test.simple@example.com',
  'Test',
  'Simple',
  '0123456789',
  '123 Rue Test',
  '75001',
  'Paris',
  'user',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 6. Vérifier que l'utilisateur simple a été créé
SELECT 
  'Utilisateur simple créé' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE id = '99999999-9999-9999-9999-999999999999';
