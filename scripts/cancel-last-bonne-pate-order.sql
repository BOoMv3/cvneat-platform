-- Annuler la commande la plus récente de "La Bonne Pâte"
-- ID du restaurant: d6725fe6-59ec-413a-b39b-ddb960824999

-- 1. Voir la commande la plus récente
SELECT 
  id,
  created_at,
  statut,
  payment_status,
  total,
  frais_livraison,
  customer_email,
  customer_first_name,
  customer_last_name,
  stripe_payment_intent_id
FROM commandes
WHERE restaurant_id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
  AND statut != 'annulee'
  AND statut != 'livree'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Annuler la commande la plus récente
UPDATE commandes
SET 
  statut = 'annulee',
  updated_at = NOW()
WHERE restaurant_id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
  AND statut != 'annulee'
  AND statut != 'livree'
  AND id = (
    SELECT id
    FROM commandes
    WHERE restaurant_id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
      AND statut != 'annulee'
      AND statut != 'livree'
    ORDER BY created_at DESC
    LIMIT 1
  );

-- 3. Vérifier que la commande a été annulée
SELECT 
  id,
  created_at,
  statut,
  payment_status,
  updated_at
FROM commandes
WHERE restaurant_id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
ORDER BY created_at DESC
LIMIT 1;

