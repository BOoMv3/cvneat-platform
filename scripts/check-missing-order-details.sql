-- Script pour vérifier et diagnostiquer les détails de commande manquants
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier toutes les commandes et leurs détails
SELECT 
  c.id as commande_id,
  c.total,
  c.frais_livraison,
  c.created_at,
  c.statut,
  r.nom as restaurant_nom,
  COUNT(dc.id) as nombre_details,
  CASE 
    WHEN COUNT(dc.id) = 0 THEN '❌ Aucun détail'
    ELSE '✅ ' || COUNT(dc.id) || ' détail(s)'
  END as statut_details
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN details_commande dc ON dc.commande_id = c.id
GROUP BY c.id, c.total, c.frais_livraison, c.created_at, c.statut, r.nom
ORDER BY c.created_at DESC
LIMIT 50;

-- 2. Vérifier spécifiquement la commande 1f972545
SELECT 
  c.id as commande_id,
  c.total,
  c.frais_livraison,
  c.created_at,
  c.statut,
  c.user_id,
  c.restaurant_id,
  r.nom as restaurant_nom,
  COUNT(dc.id) as nombre_details
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN details_commande dc ON dc.commande_id = c.id
WHERE c.id = '1f972545-1a55-42ca-a0f3-37b878d5e42e'
GROUP BY c.id, c.total, c.frais_livraison, c.created_at, c.statut, c.user_id, c.restaurant_id, r.nom;

-- 3. Vérifier si des détails existent pour cette commande (sans GROUP BY)
SELECT *
FROM details_commande
WHERE commande_id = '1f972545-1a55-42ca-a0f3-37b878d5e42e';

-- 4. Vérifier les informations de paiement Stripe pour cette commande
SELECT 
  c.id,
  c.total,
  c.stripe_payment_intent_id,
  c.created_at,
  CASE 
    WHEN c.stripe_payment_intent_id IS NOT NULL THEN '✅ Payment Intent disponible'
    ELSE '❌ Pas de Payment Intent'
  END as stripe_status
FROM commandes c
WHERE c.id = '1f972545-1a55-42ca-a0f3-37b878d5e42e';

-- 5. Statistiques globales : Combien de commandes n'ont pas de détails ?
SELECT 
  COUNT(*) FILTER (WHERE dc.id IS NULL) as commandes_sans_details,
  COUNT(*) FILTER (WHERE dc.id IS NOT NULL) as commandes_avec_details,
  COUNT(*) as total_commandes
FROM commandes c
LEFT JOIN details_commande dc ON dc.commande_id = c.id
WHERE dc.commande_id IS NULL OR dc.commande_id IS NOT NULL;

-- 6. Liste toutes les commandes sans détails
SELECT 
  c.id,
  c.total,
  c.created_at,
  c.statut,
  r.nom as restaurant_nom
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
WHERE NOT EXISTS (
  SELECT 1 
  FROM details_commande dc 
  WHERE dc.commande_id = c.id
)
ORDER BY c.created_at DESC;

