-- SCRIPT POUR VÉRIFIER LES COMMANDES RÉCENTES
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LES COMMANDES RÉCENTES
SELECT 
  id,
  restaurant_id,
  user_id,
  statut,
  total,
  adresse_livraison,
  created_at,
  updated_at
FROM commandes 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. VÉRIFIER LES COMMANDES ANNULÉES
SELECT 
  id,
  restaurant_id,
  user_id,
  statut,
  total,
  adresse_livraison,
  created_at,
  updated_at
FROM commandes 
WHERE statut = 'annulee'
ORDER BY created_at DESC 
LIMIT 5;

-- 3. VÉRIFIER LES COMMANDES PAR STATUT
SELECT 
  statut,
  COUNT(*) as nombre_commandes
FROM commandes 
GROUP BY statut
ORDER BY nombre_commandes DESC;
