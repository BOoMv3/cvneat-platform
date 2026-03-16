-- =============================================================================
-- 99 STREET FOOD – Vrai recompte : commandes livrées, total dû, virements, reste
-- =============================================================================
-- Aucune date fixe : on utilise TOUS les virements en base. Les commandes exclues
-- (table commandes_payout_exclude, ex. doublons) ne sont pas comptées.
-- Prérequis : migration 20260317000000_commandes_payout_exclude.sql (sinon enlever les AND NOT EXISTS(...)).
-- =============================================================================

-- 1) Nombre de commandes livrées + payées (hors commandes_payout_exclude)
SELECT
  '1) Nombre de commandes livrées et payées (99 SF)' AS etape,
  COUNT(*) AS nb_commandes
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'livree'
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
  AND NOT EXISTS (SELECT 1 FROM commandes_payout_exclude e WHERE e.commande_id = c.id);

-- 2) Total part restaurant (hors commandes_payout_exclude)
SELECT
  '2) Total dû (part restaurant sur toutes les commandes livrées)' AS etape,
  COUNT(*) AS nb_commandes,
  ROUND(SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS total_du_eur
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'livree'
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
  AND NOT EXISTS (SELECT 1 FROM commandes_payout_exclude e WHERE e.commande_id = c.id);

-- 3) Total déjà viré (tous les virements en base pour 99 SF)
SELECT
  '3) Total déjà viré (virements effectués)' AS etape,
  COUNT(*) AS nb_virements,
  ROUND(SUM(rt.amount)::numeric, 2) AS total_vire_eur
FROM restaurant_transfers rt
JOIN restaurants r ON r.id = rt.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND rt.status = 'completed';

-- 4) Reste à payer = Total dû - Total viré
WITH total_du AS (
  SELECT SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20))) AS s
  FROM commandes c
  JOIN restaurants r ON r.id = c.restaurant_id
  WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
    AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
    AND NOT EXISTS (SELECT 1 FROM commandes_payout_exclude e WHERE e.commande_id = c.id)
),
total_vire AS (
  SELECT COALESCE(SUM(rt.amount), 0) AS s
  FROM restaurant_transfers rt
  JOIN restaurants r ON r.id = rt.restaurant_id
  WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
    AND rt.status = 'completed'
)
SELECT
  '4) RÉSULTAT – Reste à payer' AS etape,
  ROUND((SELECT s FROM total_du)::numeric, 2) AS total_du_eur,
  ROUND((SELECT s FROM total_vire)::numeric, 2) AS total_vire_eur,
  ROUND(GREATEST(0, (SELECT s FROM total_du) - (SELECT s FROM total_vire))::numeric, 2) AS reste_a_payer_eur;

-- 5) MÊME LOGIQUE QUE L'APP : plafond 120 commandes (les 120 plus RÉCENTES) pour 99 SF
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
),
livrees AS (
  SELECT c.id, c.created_at, COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)) AS payout
  FROM commandes c, id_99
  WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
    AND NOT EXISTS (SELECT 1 FROM commandes_payout_exclude e WHERE e.commande_id = c.id)
),
rang AS (
  SELECT id, created_at, payout, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM livrees
),
les_120 AS ( SELECT id, payout FROM rang WHERE rn > (SELECT COUNT(*) - 120 FROM rang) )
SELECT
  '5) 99 SF – Plafonné à 120 cmd (comme l''app)' AS etape,
  120 AS nb_commandes,
  ROUND(SUM(les_120.payout)::numeric, 2) AS total_du_120_eur
FROM les_120;
