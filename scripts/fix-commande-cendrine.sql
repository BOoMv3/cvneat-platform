-- Script pour corriger la commande de Cendrine
-- Paiement réussi sur Stripe mais commande marquée comme annulée

-- 1. Vérifier d'abord la commande de Cendrine
SELECT 
  id,
  customer_email,
  customer_first_name,
  customer_last_name,
  statut,
  payment_status,
  stripe_payment_intent_id,
  total,
  frais_livraison,
  created_at
FROM commandes
WHERE customer_email ILIKE '%cendrine%'
   OR (customer_first_name ILIKE '%cendrine%' OR customer_last_name ILIKE '%cendrine%')
ORDER BY created_at DESC
LIMIT 10;

-- 2. Si vous avez trouvé la commande, remplacez 'COMMANDE_ID_ICI' par l'ID de la commande
-- et décommentez les lignes suivantes pour corriger :

/*
UPDATE commandes
SET 
  payment_status = 'paid',
  statut = CASE 
    WHEN statut = 'annulee' THEN 'en_attente'
    ELSE statut
  END,
  updated_at = NOW()
WHERE id = 'COMMANDE_ID_ICI'  -- ⚠️ REMPLACER PAR L'ID DE LA COMMANDE
  AND stripe_payment_intent_id IS NOT NULL
  AND payment_status != 'paid';

-- 3. Vérifier le résultat
SELECT 
  id,
  customer_email,
  customer_first_name,
  customer_last_name,
  statut,
  payment_status,
  stripe_payment_intent_id,
  updated_at
FROM commandes
WHERE id = 'COMMANDE_ID_ICI';  -- ⚠️ REMPLACER PAR L'ID DE LA COMMANDE
*/

