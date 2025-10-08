-- Script pour vérifier les commandes du livreur
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier le livreur connecté
SELECT 
  id,
  email,
  role,
  prenom,
  nom
FROM users 
WHERE email = 'livreur.test@example.com';

-- 2. Vérifier toutes les commandes avec livreur_id non null
SELECT 
  id,
  statut,
  livreur_id,
  restaurant_id,
  total,
  created_at,
  updated_at
FROM commandes 
WHERE livreur_id IS NOT NULL
ORDER BY created_at DESC;

-- 3. Vérifier les commandes avec statut 'en_livraison'
SELECT 
  id,
  statut,
  livreur_id,
  restaurant_id,
  total,
  created_at,
  updated_at
FROM commandes 
WHERE statut = 'en_livraison'
ORDER BY created_at DESC;

-- 4. Vérifier les commandes pour le livreur spécifique
SELECT 
  id,
  statut,
  livreur_id,
  restaurant_id,
  total,
  created_at,
  updated_at
FROM commandes 
WHERE livreur_id = '30574c6c-9843-4eab-be9f-456a383d3957'
ORDER BY created_at DESC;

-- 5. Vérifier les commandes avec statut 'pret_a_livrer' (disponibles)
SELECT 
  id,
  statut,
  livreur_id,
  restaurant_id,
  total,
  created_at,
  updated_at
FROM commandes 
WHERE statut = 'pret_a_livrer'
  AND livreur_id IS NULL
ORDER BY created_at DESC;
