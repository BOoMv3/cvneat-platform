-- SCRIPT POUR DÉBOGUER LA VALIDATION COMPLÈTE
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LA DERNIÈRE COMMANDE CRÉÉE
SELECT 
  id,
  restaurant_id,
  statut,
  total,
  frais_livraison,
  adresse_livraison,
  created_at,
  updated_at,
  (updated_at - created_at) as temps_avant_changement
FROM commandes 
ORDER BY created_at DESC 
LIMIT 3;

-- 2. VÉRIFIER LE RESTAURANT ASSOCIÉ
SELECT 
  id,
  nom,
  is_active,
  commande_min,
  frais_livraison,
  horaires
FROM restaurants
WHERE id = '4572cee6-1fc6-4f32-b007-57c46871ec70';

-- 3. VÉRIFIER LES ARTICLES DU MENU
SELECT 
  id,
  nom,
  prix,
  disponible,
  restaurant_id
FROM menus
WHERE restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
  AND disponible = true;

-- 4. VÉRIFIER LES DÉTAILS DE LA DERNIÈRE COMMANDE
SELECT 
  dc.id,
  dc.commande_id,
  dc.plat_id,
  m.nom as plat_nom,
  m.disponible as plat_disponible,
  dc.quantite,
  dc.prix_unitaire
FROM details_commande dc
LEFT JOIN menus m ON m.id = dc.plat_id
WHERE dc.commande_id IN (
  SELECT id FROM commandes 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- 5. VÉRIFIER LA TABLE DELIVERY_ZONES (pour la validation)
SELECT 
  id,
  restaurant_id,
  name,
  is_active
FROM delivery_zones
WHERE restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70';

-- 6. VÉRIFIER LES COMMANDES ACTIVES POUR LA CAPACITÉ
SELECT 
  COUNT(*) as commandes_actives,
  statut
FROM commandes
WHERE restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
  AND statut IN ('en_attente', 'acceptee', 'en_preparation', 'prete')
GROUP BY statut;
