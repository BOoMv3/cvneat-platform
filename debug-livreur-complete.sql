-- SCRIPT COMPLET POUR DIAGNOSTIQUER LE PROBLÈME LIVREUR
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LES COMMANDES AVEC STATUT 'pret_a_livrer'
SELECT 
  id,
  statut,
  restaurant_id,
  livreur_id,
  created_at,
  updated_at
FROM commandes 
WHERE statut = 'pret_a_livrer'
ORDER BY created_at DESC;

-- 2. VÉRIFIER TOUTES LES COMMANDES ET LEURS STATUTS
SELECT 
  statut,
  COUNT(*) as count,
  COUNT(CASE WHEN livreur_id IS NULL THEN 1 END) as sans_livreur,
  COUNT(CASE WHEN livreur_id IS NOT NULL THEN 1 END) as avec_livreur
FROM commandes 
GROUP BY statut
ORDER BY statut;

-- 3. VÉRIFIER LES LIVREURS DISPONIBLES
SELECT 
  id,
  email,
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
ORDER BY policyname;

-- 5. TESTER UNE REQUÊTE LIVREUR SIMPLE
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
