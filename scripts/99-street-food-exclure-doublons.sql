-- =============================================================================
-- 99 STREET FOOD – Repérer les doublons et les exclure du calcul "reste à payer"
-- =============================================================================
-- Pas de colonne order_number en base : on détecte les doublons par (date Paris + total).
-- Si la même date et le même montant apparaissent 2 fois ou plus, on garde une seule
-- commande et on exclut les autres du calcul.
--
-- Prérequis : migration 20260317000000_commandes_payout_exclude.sql (table commandes_payout_exclude)
-- =============================================================================

-- 1) Doublons par (date Paris + total) : liste avec GARDER / EXCLURE
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
),
livrees AS (
  SELECT c.id, (c.created_at AT TIME ZONE 'Europe/Paris')::date AS date_paris, c.total, c.created_at
  FROM commandes c, id_99
  WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
),
groupes AS (
  SELECT date_paris, total, COUNT(*) AS nb, MIN(id) AS id_a_garder
  FROM livrees
  GROUP BY date_paris, total
  HAVING COUNT(*) > 1
)
SELECT l.id, l.date_paris, l.total, l.created_at,
  CASE WHEN l.id = g.id_a_garder THEN 'GARDER' ELSE 'EXCLURE' END AS action
FROM livrees l
JOIN groupes g ON g.date_paris = l.date_paris AND g.total = l.total
ORDER BY l.date_paris, l.total, l.created_at;

-- 2) Exclure du calcul les doublons (même date + total) : on garde la 1ère (min id), on exclut les autres
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
),
livrees AS (
  SELECT c.id, (c.created_at AT TIME ZONE 'Europe/Paris')::date AS d, c.total,
    ROW_NUMBER() OVER (PARTITION BY (c.created_at AT TIME ZONE 'Europe/Paris')::date, c.total ORDER BY c.created_at, c.id) AS rn
  FROM commandes c, id_99
  WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
)
INSERT INTO commandes_payout_exclude (commande_id, reason)
SELECT id, 'Doublon 99 SF (même date+total)'
FROM livrees WHERE rn > 1
ON CONFLICT (commande_id) DO NOTHING;
