-- Script pour corriger la commande de Cendrine avec le payment_intent_id
-- Payment Intent ID: pi_3Sg7UUC4JdsisQ572rz4zofw

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
  created_at,
  updated_at
FROM commandes
WHERE stripe_payment_intent_id = 'pi_3Sg7UUC4JdsisQ572rz4zofw';

-- 2. Si la commande est trouvée et que le paiement a réussi sur Stripe,
-- décommentez les lignes suivantes pour corriger :

/*
UPDATE commandes
SET 
  payment_status = 'paid',
  statut = CASE 
    WHEN statut = 'annulee' THEN 'en_attente'
    ELSE statut
  END,
  updated_at = NOW()
WHERE stripe_payment_intent_id = 'pi_3Sg7UUC4JdsisQ572rz4zofw'
  AND (
    payment_status IN ('failed', 'cancelled', 'pending')
    OR statut = 'annulee'
    OR payment_status IS NULL
  );

-- 3. Vérifier le résultat
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
  updated_at
FROM commandes
WHERE stripe_payment_intent_id = 'pi_3Sg7UUC4JdsisQ572rz4zofw';
*/

