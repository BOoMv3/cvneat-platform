-- SCRIPT POUR DIAGNOSTIQUER LA COMMANDE COURANTE
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LA COMMANDE COURANTE
SELECT 
  id,
  statut,
  livreur_id,
  restaurant_id,
  adresse_livraison,
  total,
  frais_livraison,
  created_at,
  updated_at
FROM commandes 
WHERE id = '2202b8b1-1b7b-4934-af71-b6ddf5b498ab';

-- 2. VÉRIFIER LE RESTAURANT ASSOCIÉ
SELECT 
  r.id,
  r.nom,
  r.adresse,
  r.telephone,
  r.frais_livraison
FROM restaurants r
JOIN commandes c ON c.restaurant_id = r.id
WHERE c.id = '2202b8b1-1b7b-4934-af71-b6ddf5b498ab';

-- 3. VÉRIFIER LES DÉTAILS DE LA COMMANDE
SELECT 
  dc.id,
  dc.plat_id,
  dc.quantite,
  dc.prix_unitaire,
  m.nom as menu_nom,
  m.prix as menu_prix
FROM details_commande dc
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE dc.commande_id = '2202b8b1-1b7b-4934-af71-b6ddf5b498ab';

-- 4. VÉRIFIER L'UTILISATEUR ASSOCIÉ
SELECT 
  u.id,
  u.nom,
  u.prenom,
  u.telephone,
  ua.address,
  ua.city,
  ua.postal_code
FROM commandes c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN user_addresses ua ON c.user_id = ua.user_id
WHERE c.id = '2202b8b1-1b7b-4934-af71-b6ddf5b498ab';
