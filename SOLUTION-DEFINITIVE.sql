-- SOLUTION DÉFINITIVE POUR CRÉER L'UTILISATEUR
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER EXACTEMENT LA CONTRAINTE DE RÔLE
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
  AND conname LIKE '%role%';

-- 2. VÉRIFIER TOUS LES RÔLES EXISTANTS
SELECT DISTINCT role 
FROM users 
ORDER BY role;

-- 3. VÉRIFIER LA STRUCTURE COMPLÈTE DE LA TABLE users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 4. SUPPRIMER L'UTILISATEUR S'IL EXISTE DÉJÀ (pour repartir proprement)
DELETE FROM users WHERE id = '30574c6c-9843-4eab-be9f-456a383d3957';

-- 5. CRÉER L'UTILISATEUR AVEC TOUS LES CHAMPS OBLIGATOIRES
-- Utilisons les mêmes valeurs que l'utilisateur restaurant qui fonctionne
INSERT INTO users (
  id,
  nom,
  prenom,
  telephone,
  adresse,
  code_postal,
  ville,
  role,
  email,
  created_at,
  updated_at
) VALUES (
  '30574c6c-9843-4eab-be9f-456a383d3957',
  'Client',
  'Test',
  '0123456789',
  'Adresse par défaut',
  '34000',
  'Montpellier',
  'restaurant',  -- Utilisons le même rôle que l'utilisateur qui fonctionne
  'client.test@example.com',
  NOW(),
  NOW()
);

-- 6. VÉRIFIER QUE L'UTILISATEUR A ÉTÉ CRÉÉ
SELECT 
  id,
  email,
  nom,
  prenom,
  role,
  telephone,
  adresse
FROM users 
WHERE id = '30574c6c-9843-4eab-be9f-456a383d3957';
