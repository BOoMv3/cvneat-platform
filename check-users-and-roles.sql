-- Vérifier les utilisateurs et leurs rôles
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier tous les utilisateurs et leurs rôles
SELECT 
  id,
  email,
  nom,
  prenom,
  role,
  created_at
FROM users 
ORDER BY created_at DESC;

-- 2. Vérifier spécifiquement les livreurs
SELECT 
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE role = 'delivery'
ORDER BY created_at DESC;

-- 3. Vérifier les restaurants
SELECT 
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE role = 'restaurant'
ORDER BY created_at DESC;

-- 4. Compter par rôle
SELECT 
  role,
  COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY count DESC;
