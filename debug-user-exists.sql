-- SCRIPT POUR VÉRIFIER SI L'UTILISATEUR EXISTE
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER SI L'UTILISATEUR EXISTE DANS LA TABLE users
SELECT 
  id,
  email,
  nom,
  prenom,
  role,
  created_at
FROM users 
WHERE id = '30574c6c-9843-4eab-be9f-456a383d3957';

-- 2. VÉRIFIER DANS SUPABASE AUTH (si possible)
-- Cette requête peut ne pas fonctionner selon les permissions
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE id = '30574c6c-9843-4eab-be9f-456a383d3957';

-- 3. CRÉER L'UTILISATEUR S'IL N'EXISTE PAS
-- (Exécutez seulement si l'utilisateur n'existe pas dans la table users)
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
  'customer',
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
