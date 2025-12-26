-- Script SQL pour fermer le Burger Cévenol et annuler leur dernière commande
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Trouver le Burger Cévenol
SELECT 
    id,
    nom,
    email,
    telephone,
    ferme_manuellement,
    status
FROM restaurants
WHERE nom ILIKE '%burger%cevenol%' 
   OR nom ILIKE '%burger%cévenol%'
   OR nom ILIKE '%burgercevenol%';

-- ÉTAPE 2: Voir la dernière commande du Burger Cévenol (avant annulation)
SELECT 
    c.id,
    c.created_at,
    c.statut,
    c.payment_status,
    c.total,
    c.frais_livraison,
    c.stripe_payment_intent_id,
    c.user_id,
    u.email as client_email,
    u.nom as client_nom,
    u.prenom as client_prenom
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN users u ON c.user_id = u.id
WHERE (r.nom ILIKE '%burger%cevenol%' 
   OR r.nom ILIKE '%burger%cévenol%'
   OR r.nom ILIKE '%burgercevenol%')
  AND c.statut != 'annulee'
ORDER BY c.created_at DESC
LIMIT 5;

-- ÉTAPE 3: Fermer le Burger Cévenol (mettre ferme_manuellement = true)
UPDATE restaurants
SET 
    ferme_manuellement = true,
    updated_at = NOW()
WHERE nom ILIKE '%burger%cevenol%' 
   OR nom ILIKE '%burger%cévenol%'
   OR nom ILIKE '%burgercevenol%';

-- ÉTAPE 4: Trouver l'ID de la dernière commande (la plus récente, non annulée)
-- Note: Vous devez remplacer 'RESTAURANT_ID' par l'ID réel trouvé à l'étape 1
-- Ou utiliser cette requête qui trouve automatiquement la dernière commande:
WITH dernier_restaurant AS (
    SELECT id
    FROM restaurants
    WHERE nom ILIKE '%burger%cevenol%' 
       OR nom ILIKE '%burger%cévenol%'
       OR nom ILIKE '%burgercevenol%'
    LIMIT 1
),
derniere_commande AS (
    SELECT c.id as commande_id
    FROM commandes c
    CROSS JOIN dernier_restaurant r
    WHERE c.restaurant_id = r.id
      AND c.statut != 'annulee'
    ORDER BY c.created_at DESC
    LIMIT 1
)
SELECT commande_id FROM derniere_commande;

-- ÉTAPE 5: Annuler la dernière commande
-- Note: Cette étape met seulement le statut à 'annulee'
-- Pour le remboursement Stripe, utilisez l'API /api/admin/orders/cancel/[orderId] ou faites-le manuellement dans Stripe
WITH dernier_restaurant AS (
    SELECT id
    FROM restaurants
    WHERE nom ILIKE '%burger%cevenol%' 
       OR nom ILIKE '%burger%cévenol%'
       OR nom ILIKE '%burgercevenol%'
    LIMIT 1
),
derniere_commande AS (
    SELECT c.id as commande_id, c.stripe_payment_intent_id, c.total, c.frais_livraison
    FROM commandes c
    CROSS JOIN dernier_restaurant r
    WHERE c.restaurant_id = r.id
      AND c.statut != 'annulee'
    ORDER BY c.created_at DESC
    LIMIT 1
)
UPDATE commandes
SET 
    statut = 'annulee',
    payment_status = 'refunded',
    updated_at = NOW()
FROM derniere_commande dc
WHERE commandes.id = dc.commande_id;

-- ÉTAPE 6: Vérifier le résultat
SELECT 
    r.nom,
    r.ferme_manuellement,
    c.id as commande_id,
    c.statut,
    c.payment_status,
    c.total,
    c.frais_livraison,
    c.stripe_payment_intent_id,
    c.created_at,
    u.email as client_email
FROM restaurants r
LEFT JOIN commandes c ON c.restaurant_id = r.id
LEFT JOIN users u ON c.user_id = u.id
WHERE (r.nom ILIKE '%burger%cevenol%' 
   OR r.nom ILIKE '%burger%cévenol%'
   OR r.nom ILIKE '%burgercevenol%')
ORDER BY c.created_at DESC
LIMIT 5;

