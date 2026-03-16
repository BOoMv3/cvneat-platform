-- 99 Street Food : appliquer la coupure au 05/03/2026 (depuis le dernier virement)
-- À exécuter dans Supabase SQL Editor si tu as déjà lancé le script avec la mauvaise date (12/01).

-- 1) Exclure du comptage les commandes AVANT le 05/03/2026 (elles sont déjà couvertes par tes 4 virements)
UPDATE commandes
SET statut = 'annulee', payment_status = 'cancelled', updated_at = NOW()
WHERE restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1)
  AND statut = 'livree'
  AND (payment_status IN ('paid', 'succeeded') OR payment_status IS NULL)
  AND created_at < '2026-03-05';

-- 2) Voir ce que tu lui dois depuis le 05/03/2026 (commandes restantes + reste à payer)
WITH dues AS (
  SELECT
    r.id AS rid,
    COUNT(*) AS nb_cmd,
    SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20))) AS total_du
  FROM commandes c
  JOIN restaurants r ON r.id = c.restaurant_id
  WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
    AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
    AND c.created_at >= '2026-03-05'
  GROUP BY r.id
),
virements AS (
  SELECT rt.restaurant_id, SUM(rt.amount) AS total_vire
  FROM restaurant_transfers rt
  WHERE rt.status = 'completed'
  GROUP BY rt.restaurant_id
)
SELECT
  '99 Street Food' AS restaurant,
  d.nb_cmd AS nb_commandes_depuis_05_mars,
  ROUND(d.total_du::numeric, 2) AS total_du_eur,
  ROUND(COALESCE(v.total_vire, 0)::numeric, 2) AS total_deja_vire_eur,
  ROUND(GREATEST(0, (d.total_du - COALESCE(v.total_vire, 0)))::numeric, 2) AS reste_a_payer_eur
FROM dues d
LEFT JOIN virements v ON v.restaurant_id = d.rid;
