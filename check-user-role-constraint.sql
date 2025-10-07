-- SCRIPT POUR VÉRIFIER LA CONTRAINTE DE RÔLE
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LA CONTRAINTE DE RÔLE
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
  AND conname LIKE '%role%';

-- 2. VÉRIFIER LES RÔLES EXISTANTS DANS LA TABLE
SELECT DISTINCT role 
FROM users 
ORDER BY role;

-- 3. CRÉER L'UTILISATEUR AVEC LE BON RÔLE
-- Essayons avec 'client' au lieu de 'customer'
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
  created_at
) VALUES (
  '30574c6c-9843-4eab-be9f-456a383d3957',
  'client.test@example.com',
  'Client',
  'Test',
  '0123456789',
  'Adresse par défaut',
  '34000',
  'Montpellier',
  'client',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. VÉRIFIER QUE L'UTILISATEUR A ÉTÉ CRÉÉ
SELECT 
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE id = '30574c6c-9843-4eab-be9f-456a383d3957';
