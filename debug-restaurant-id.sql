-- SCRIPT DE DEBUG : VÉRIFIER LES RESTAURANT_ID
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LE RESTAURANT DE L'UTILISATEUR CONNECTÉ
SELECT 
  r.id as restaurant_id,
  r.nom as restaurant_nom,
  r.user_id,
  u.email as user_email,
  u.role as user_role
FROM restaurants r
JOIN users u ON r.user_id = u.id
WHERE u.id = '30574c6c-9843-4eab-be9f-456a383d3957';

-- 2. VÉRIFIER TOUTES LES COMMANDES AVEC LEUR RESTAURANT_ID
SELECT 
  c.id as commande_id,
  c.restaurant_id,
  c.statut,
  c.total,
  c.created_at,
  r.nom as restaurant_nom
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
ORDER BY c.created_at DESC;

-- 3. COMPTER LES COMMANDES PAR RESTAURANT
SELECT 
  c.restaurant_id,
  r.nom as restaurant_nom,
  COUNT(*) as nombre_commandes
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
GROUP BY c.restaurant_id, r.nom;

-- 4. VÉRIFIER SPÉCIFIQUEMENT LES COMMANDES POUR LE RESTAURANT DE L'UTILISATEUR
SELECT 
  c.id as commande_id,
  c.restaurant_id,
  c.statut,
  c.total,
  c.created_at
FROM commandes c
WHERE c.restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
ORDER BY c.created_at DESC;
