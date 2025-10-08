-- SCRIPT POUR DIAGNOSTIQUER LES COMMANDES LIVREUR
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER TOUTES LES COMMANDES ET LEURS STATUTS
SELECT 
  id,
  statut,
  restaurant_id,
  livreur_id,
  created_at,
  updated_at
FROM commandes 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. VÉRIFIER LES COMMANDES PRÊTES À LIVRER (sans livreur assigné)
SELECT 
  id,
  statut,
  restaurant_id,
  livreur_id,
  total,
  created_at
FROM commandes 
WHERE statut = 'pret_a_livrer' 
  AND livreur_id IS NULL
ORDER BY created_at DESC;

-- 3. VÉRIFIER LES LIVREURS DISPONIBLES
SELECT 
  id,
  email,
  nom,
  prenom,
  role,
  created_at
FROM users 
WHERE role = 'delivery' 
ORDER BY created_at DESC;

-- 4. VÉRIFIER LES POLITIQUES RLS POUR LES LIVREURS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'commandes'
  AND (policyname LIKE '%delivery%' OR policyname LIKE '%livreur%');

-- 5. TESTER UNE REQUÊTE COMME UN LIVREUR
-- Simuler la requête que fait l'API livreur
SELECT 
  id,
  statut,
  restaurant_id,
  total,
  created_at
FROM commandes 
WHERE statut = 'pret_a_livrer' 
  AND livreur_id IS NULL
ORDER BY created_at DESC 
LIMIT 5;
