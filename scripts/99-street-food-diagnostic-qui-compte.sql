-- =============================================================================
-- 99 STREET FOOD – Voir EXACTEMENT quelles commandes sont comptées "depuis 05/03"
-- =============================================================================
-- Exécuter dans Supabase SQL Editor pour lister chaque commande qui entre dans
-- le "montant dû" et le "nombre de commandes" sur la page Virements.
-- Si des lignes ne devraient pas être là, on pourra ajuster la date de coupure
-- ou exclure des commandes.
-- =============================================================================

-- Coupure : 06/03 00:00 Paris = 05/03 23:00 UTC (après le virement du 05/03)
WITH cmd_99 AS (
  SELECT
    c.id,
    c.created_at,
    (c.created_at AT TIME ZONE 'Europe/Paris')::date AS date_paris,
    c.total,
    COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)) AS payout
  FROM commandes c
  JOIN restaurants r ON r.id = c.restaurant_id
  WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
    AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
    AND c.created_at >= '2026-03-05T23:00:00+00'
)
SELECT
  id,
  date_paris AS date_commande_paris,
  total,
  ROUND(payout::numeric, 2) AS part_restaurant_eur
FROM cmd_99
ORDER BY date_paris, id;

-- Résumé par jour (pour vérifier rapidement)
WITH cmd_99 AS (
  SELECT
    (c.created_at AT TIME ZONE 'Europe/Paris')::date AS date_paris,
    COUNT(*) AS nb,
    SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20))) AS payout
  FROM commandes c
  JOIN restaurants r ON r.id = c.restaurant_id
  WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
    AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
    AND c.created_at >= '2026-03-05T23:00:00+00'
  GROUP BY (c.created_at AT TIME ZONE 'Europe/Paris')::date
)
SELECT date_paris, nb AS nb_commandes, ROUND(payout::numeric, 2) AS part_restaurant_eur
FROM cmd_99
ORDER BY date_paris;
