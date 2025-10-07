-- SCRIPT POUR DÉBOGUER LES COMMANDES ANNULÉES
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LES 10 DERNIÈRES COMMANDES
SELECT 
  id,
  restaurant_id,
  statut,
  total,
  frais_livraison,
  adresse_livraison,
  created_at,
  updated_at
FROM commandes 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. COMPTER LES COMMANDES PAR STATUT
SELECT 
  statut,
  COUNT(*) as nombre
FROM commandes 
GROUP BY statut
ORDER BY nombre DESC;

-- 3. VÉRIFIER LES COMMANDES ANNULÉES RÉCENTES
SELECT 
  c.id,
  c.restaurant_id,
  r.nom as restaurant_nom,
  c.statut,
  c.total,
  c.created_at,
  c.updated_at,
  (c.updated_at - c.created_at) as duree_avant_annulation
FROM commandes c
LEFT JOIN restaurants r ON r.id = c.restaurant_id
WHERE c.statut = 'annulee'
ORDER BY c.created_at DESC
LIMIT 5;

-- 4. VÉRIFIER SI LES RESTAURANTS SONT ACTIFS
SELECT 
  id,
  nom,
  is_active,
  horaires
FROM restaurants
WHERE id IN (
  SELECT DISTINCT restaurant_id 
  FROM commandes 
  WHERE created_at > NOW() - INTERVAL '1 day'
);

-- 5. VÉRIFIER LES DÉTAILS DES COMMANDES ANNULÉES
SELECT 
  c.id as commande_id,
  c.statut,
  dc.plat_id,
  m.nom as plat_nom,
  m.disponible as plat_disponible,
  dc.quantite,
  dc.prix_unitaire
FROM commandes c
LEFT JOIN details_commande dc ON dc.commande_id = c.id
LEFT JOIN menus m ON m.id = dc.plat_id
WHERE c.statut = 'annulee'
  AND c.created_at > NOW() - INTERVAL '1 day'
ORDER BY c.created_at DESC;
