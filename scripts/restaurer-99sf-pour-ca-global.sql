-- Restaurer les commandes 99 Street Food (avant 05/03/2026) en livrée + payée
-- pour que le CA global (dashboard admin) et le CA Livreur reflètent à nouveau la réalité.
-- Le "reste à payer" 99 SF reste calculé depuis le 05/03 uniquement (côté app).

UPDATE commandes
SET statut = 'livree', payment_status = 'paid', updated_at = NOW()
WHERE restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1)
  AND statut = 'annulee'
  AND (payment_status = 'cancelled' OR payment_status IS NULL)
  AND created_at < '2026-03-05';
