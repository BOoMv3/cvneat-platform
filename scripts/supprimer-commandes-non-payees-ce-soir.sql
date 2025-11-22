-- Script pour supprimer les commandes non payées de ce soir
-- À exécuter dans Supabase SQL Editor

-- IMPORTANT: Ce script supprime définitivement les commandes non payées
-- Il est recommandé de faire une sauvegarde avant d'exécuter

-- 1. Vérifier d'abord combien de commandes seront supprimées
SELECT 
  COUNT(*) as nombre_commandes_a_supprimer,
  SUM(total) as montant_total_non_paye,
  MIN(created_at) as premiere_commande,
  MAX(created_at) as derniere_commande
FROM commandes
WHERE payment_status = 'pending'
  AND DATE(created_at) = CURRENT_DATE
  AND created_at >= CURRENT_DATE;

-- 2. Voir les détails des commandes qui seront supprimées
SELECT 
  id,
  created_at,
  statut,
  payment_status,
  total,
  frais_livraison,
  restaurant_id,
  adresse_livraison
FROM commandes
WHERE payment_status = 'pending'
  AND DATE(created_at) = CURRENT_DATE
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- 3. SUPPRIMER les détails de commande associés (d'abord, pour respecter les contraintes de clé étrangère)
DELETE FROM details_commande
WHERE commande_id IN (
  SELECT id
  FROM commandes
  WHERE payment_status = 'pending'
    AND DATE(created_at) = CURRENT_DATE
    AND created_at >= CURRENT_DATE
);

-- 4. SUPPRIMER les commandes non payées de ce soir
DELETE FROM commandes
WHERE payment_status = 'pending'
  AND DATE(created_at) = CURRENT_DATE
  AND created_at >= CURRENT_DATE;

-- 5. Vérifier que la suppression a bien fonctionné
SELECT 
  COUNT(*) as commandes_restantes_non_payees,
  'Vérification après suppression' as statut
FROM commandes
WHERE payment_status = 'pending'
  AND DATE(created_at) = CURRENT_DATE
  AND created_at >= CURRENT_DATE;

