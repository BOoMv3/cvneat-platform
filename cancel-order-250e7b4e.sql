-- Script pour annuler la commande avec ID partiel 250e7b4e
-- Ce script met à jour le statut de la commande à 'annulee'
-- NOTE: Si vous avez l'ID complet (UUID), remplacez la condition WHERE par: WHERE id = 'ID_COMPLET'

-- 1. D'abord vérifier quelle commande correspond à cet ID partiel
SELECT 
  id,
  statut,
  payment_status,
  total,
  frais_livraison,
  stripe_payment_intent_id,
  stripe_refund_id,
  refund_amount,
  created_at,
  updated_at
FROM commandes
WHERE id LIKE '%250e7b4e%';

-- 2. Annuler la commande (décommentez après avoir vérifié que c'est la bonne commande)
-- UPDATE commandes
-- SET 
--   statut = 'annulee',
--   payment_status = 'refunded',
--   updated_at = NOW()
-- WHERE id LIKE '%250e7b4e%'
--   AND statut != 'annulee';

-- 3. Vérifier le résultat après mise à jour
-- SELECT 
--   id,
--   statut,
--   payment_status,
--   total,
--   frais_livraison,
--   stripe_refund_id,
--   refund_amount,
--   updated_at
-- FROM commandes
-- WHERE id LIKE '%250e7b4e%';

