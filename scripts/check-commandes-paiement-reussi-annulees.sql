-- Script pour trouver les commandes où le paiement a réussi sur Stripe
-- mais la commande est marquée comme annulée ou échouée

SELECT 
  c.id,
  c.order_number,
  c.customer_email,
  c.customer_first_name,
  c.customer_last_name,
  c.statut,
  c.payment_status,
  c.stripe_payment_intent_id,
  c.stripe_charge_id,
  c.total,
  c.frais_livraison,
  c.created_at,
  c.updated_at,
  r.nom as restaurant_nom
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
WHERE 
  -- Paiement réussi sur Stripe (payment_intent_id présent)
  c.stripe_payment_intent_id IS NOT NULL
  AND (
    -- Mais statut de paiement incorrect
    c.payment_status IN ('failed', 'cancelled', 'pending')
    OR c.statut = 'annulee'
    OR c.payment_status IS NULL
  )
ORDER BY c.created_at DESC
LIMIT 50;

