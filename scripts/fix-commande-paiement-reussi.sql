-- Script pour corriger une commande spécifique où le paiement a réussi
-- mais la commande est marquée comme annulée
-- 
-- UTILISATION: Remplacez 'ORDER_ID_ICI' par l'ID de la commande à corriger

-- 1. Vérifier d'abord la commande
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
WHERE id = 'ORDER_ID_ICI'  -- ⚠️ REMPLACER PAR L'ID DE LA COMMANDE
   OR stripe_payment_intent_id = 'PAYMENT_INTENT_ID_ICI';  -- ⚠️ OU PAR LE PAYMENT_INTENT_ID

-- 2. Si le paiement a bien réussi sur Stripe, corriger le statut
-- DÉCOMMENTEZ les lignes suivantes après vérification :
/*
UPDATE commandes
SET 
  payment_status = 'paid',
  statut = CASE 
    WHEN statut = 'annulee' THEN 'en_attente'
    ELSE statut
  END,
  updated_at = NOW()
WHERE id = 'ORDER_ID_ICI'  -- ⚠️ REMPLACER PAR L'ID DE LA COMMANDE
  AND stripe_payment_intent_id IS NOT NULL
  AND payment_status != 'paid';

-- 3. Vérifier le résultat
SELECT 
  id,
  customer_email,
  statut,
  payment_status,
  stripe_payment_intent_id,
  updated_at
FROM commandes
WHERE id = 'ORDER_ID_ICI';  -- ⚠️ REMPLACER PAR L'ID DE LA COMMANDE
*/

