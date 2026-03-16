-- Restaurer 99 Street Food : remettre en "livrée" + "payée" UNIQUEMENT les commandes
-- qui avaient bien été livrées (pas celles déjà annulées/remboursées avant).
-- Critère : pas de trace de remboursement réel (stripe_refund_id / refunded_at vides).
-- On exclut aussi les 3 dernières (celles qu'on voulait annuler ce soir-là).
-- À exécuter dans Supabase SQL Editor.

-- 1) Les 3 commandes qu'on GARDE annulées (les 3 dernières 99 SF)
SELECT c.id, c.created_at, c.statut, c.payment_status, c.total
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'annulee'
ORDER BY c.created_at DESC
LIMIT 3;

-- 2) Restaurer UNIQUEMENT les commandes sans remboursement réel (donc livrées puis annulées par erreur par nos scripts)
--    stripe_refund_id IS NULL ET refunded_at IS NULL = pas de remboursement Stripe / admin enregistré
--    + exclure les 3 plus récentes (les 3 de ce soir-là)
UPDATE commandes
SET statut = 'livree', payment_status = 'paid', updated_at = NOW()
WHERE restaurant_id = (
  SELECT id FROM restaurants
  WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%'
  LIMIT 1
)
  AND statut = 'annulee'
  AND (stripe_refund_id IS NULL AND refunded_at IS NULL)
  AND id NOT IN (
    SELECT id FROM commandes
    WHERE restaurant_id = (
      SELECT id FROM restaurants
      WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%'
      LIMIT 1
    )
      AND statut = 'annulee'
    ORDER BY created_at DESC
    LIMIT 3
  );

-- 3) Vérif : nombre de commandes 99 SF payées (doit avoir remonté)
SELECT
  r.nom,
  COUNT(*) FILTER (WHERE c.payment_status IN ('paid', 'succeeded')) AS commandes_payees,
  COALESCE(SUM(c.total + c.frais_livraison) FILTER (WHERE c.payment_status IN ('paid', 'succeeded')), 0) AS total_ttc
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%'
GROUP BY r.nom;
