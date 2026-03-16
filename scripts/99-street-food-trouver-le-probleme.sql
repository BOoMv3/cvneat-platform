-- =============================================================================
-- 99 STREET FOOD – Trouver d'où vient l'écart (nombre de commandes et montant)
-- =============================================================================
-- On ne se base PAS sur une date fixe (12/01 etc.) : on utilise le DERNIER VIREMENT
-- enregistré en base pour "depuis quand" compter. Tu as fait d'autres virements depuis.
--
-- Si tu vois ~180 commandes alors que ça devrait être ~120 : il y a des commandes
-- en trop (doublons, ou mauvais restaurant_id). Les blocs ci‑dessous aident à les trouver.
-- =============================================================================

-- ----- 1) Vérifier qu'il n'y a qu'un seul restaurant "99 Street Food" et son id -----
SELECT id, nom FROM restaurants
WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%';

-- ----- 2) Doublons ? (même date Paris + même total = possible doublon) -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
)
SELECT (c.created_at AT TIME ZONE 'Europe/Paris')::date AS date_paris, c.total, COUNT(*) AS nb_lignes,
  ROUND(SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS total_part_eur
FROM commandes c, id_99
WHERE c.restaurant_id = id_99.id AND c.statut = 'livree' AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
GROUP BY (c.created_at AT TIME ZONE 'Europe/Paris')::date, c.total
HAVING COUNT(*) > 1;

-- ----- 3) Répartition par mois (à comparer avec tes factures : 24, 40, 30, 26 cmd par période) -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
)
SELECT
  TO_CHAR((c.created_at AT TIME ZONE 'Europe/Paris')::date, 'YYYY-MM') AS mois,
  COUNT(*) AS nb_commandes,
  ROUND(SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS part_restaurant_eur
FROM commandes c, id_99
WHERE c.restaurant_id = id_99.id AND c.statut = 'livree' AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
GROUP BY TO_CHAR((c.created_at AT TIME ZONE 'Europe/Paris')::date, 'YYYY-MM')
ORDER BY mois;

-- ----- 4) TOUS les virements 99 SF (ce que tu as vraiment viré – y compris les récents) -----
SELECT transfer_date, amount, notes
FROM restaurant_transfers rt
JOIN restaurants r ON r.id = rt.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%') AND rt.status = 'completed'
ORDER BY transfer_date;

SELECT 'Total virements (tout ce qui est en base)' AS lib, ROUND(SUM(rt.amount)::numeric, 2) AS total_eur
FROM restaurant_transfers rt
JOIN restaurants r ON r.id = rt.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%') AND rt.status = 'completed';

-- Date du DERNIER virement (on se base sur ça pour "depuis quand" il reste à payer)
SELECT MAX(rt.transfer_date) AS dernier_virement_date
FROM restaurant_transfers rt
JOIN restaurants r ON r.id = rt.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%') AND rt.status = 'completed';

-- ----- 5) Commandes avec part restaurant anormalement haute (possible erreur de saisie) -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
)
SELECT c.id, c.created_at, c.total, c.restaurant_payout, c.commission_amount,
  ROUND((COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS part_calculee
FROM commandes c, id_99
WHERE c.restaurant_id = id_99.id AND c.statut = 'livree' AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
  AND (COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)) > 50 OR c.total > 80)
ORDER BY c.created_at DESC
LIMIT 30;

-- ----- 6) Reste à payer : TOUTES les commandes livrées − TOUS les virements (en base) -----
-- Pas de date fixe : on utilise tout ce qui est viré (bloc 4). Si tu as ajouté des virements
-- récents dans restaurant_transfers, ils sont déduits ici.
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
),
total_cmd AS (
  SELECT COUNT(*) AS nb, SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20))) AS s
  FROM commandes c, id_99
  WHERE c.restaurant_id = id_99.id AND c.statut = 'livree' AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
),
virements AS (
  SELECT COALESCE(SUM(amount), 0) AS s FROM restaurant_transfers rt
  JOIN restaurants r ON r.id = rt.restaurant_id
  WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%') AND rt.status = 'completed'
)
SELECT
  (SELECT nb FROM total_cmd) AS nb_commandes_livrees,
  ROUND((SELECT s FROM total_cmd)::numeric, 2) AS total_du_eur,
  ROUND((SELECT s FROM virements)::numeric, 2) AS total_vire_eur,
  ROUND(GREATEST(0, (SELECT s FROM total_cmd) - (SELECT s FROM virements))::numeric, 2) AS reste_a_payer_eur;

-- ----- 7) Liste des commandes 99 SF livrées (pour repérer les en trop) -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
)
SELECT c.id, (c.created_at AT TIME ZONE 'Europe/Paris')::date AS date_paris, c.total,
  ROUND((COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS part_eur
FROM commandes c, id_99
WHERE c.restaurant_id = id_99.id AND c.statut = 'livree' AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
ORDER BY c.created_at;
