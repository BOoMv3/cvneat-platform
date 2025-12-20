-- Script pour annuler la commande 2dd2185c-f55f-47b0-b232-b87d19fb5cdc
-- Ce script met à jour le statut de la commande à 'annulee'

UPDATE commandes
SET 
  statut = 'annulee',
  payment_status = 'refunded',
  updated_at = NOW()
WHERE id = '2dd2185c-f55f-47b0-b232-b87d19fb5cdc'
  AND statut != 'annulee';

-- Vérifier le résultat
SELECT 
  id,
  statut,
  payment_status,
  total,
  frais_livraison,
  stripe_payment_intent_id,
  updated_at
FROM commandes
WHERE id = '2dd2185c-f55f-47b0-b232-b87d19fb5cdc';

