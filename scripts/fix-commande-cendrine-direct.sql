-- Script DIRECT pour corriger la commande de Cendrine
-- ⚠️ À UTILISER UNIQUEMENT APRÈS AVOIR VÉRIFIÉ QUE C'EST LA BONNE COMMANDE

-- 1. Trouver la commande de Cendrine avec paiement réussi mais statut incorrect
WITH commande_cendrine AS (
  SELECT 
    id,
    customer_email,
    customer_first_name,
    customer_last_name,
    statut,
    payment_status,
    stripe_payment_intent_id,
    total,
    created_at
  FROM commandes
  WHERE (
    customer_email ILIKE '%cendrine%'
    OR customer_first_name ILIKE '%cendrine%'
    OR customer_last_name ILIKE '%cendrine%'
  )
  AND stripe_payment_intent_id IS NOT NULL
  AND (
    payment_status IN ('failed', 'cancelled', 'pending')
    OR statut = 'annulee'
    OR payment_status IS NULL
  )
  ORDER BY created_at DESC
  LIMIT 1
)
-- 2. Corriger la commande
UPDATE commandes
SET 
  payment_status = 'paid',
  statut = CASE 
    WHEN statut = 'annulee' THEN 'en_attente'
    ELSE statut
  END,
  updated_at = NOW()
WHERE id IN (SELECT id FROM commande_cendrine)
  AND stripe_payment_intent_id IS NOT NULL;

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
  updated_at
FROM commandes
WHERE (
  customer_email ILIKE '%cendrine%'
  OR customer_first_name ILIKE '%cendrine%'
  OR customer_last_name ILIKE '%cendrine%'
)
AND stripe_payment_intent_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

