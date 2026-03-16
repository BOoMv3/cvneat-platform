-- 99 Street Food : remettre tout au propre d'après les 4 factures (depuis le début CVN'EAT)
-- Dernière facture / dernier virement : 05/03/2026 (FAC-2026-000008, 575.32 €).
-- À exécuter dans Supabase SQL Editor (exécuter tout d'un coup).

-- Factures 99 Street Food :
-- 1) FAC-2025-589248 : 16/11–06/12/2025, virement 10/12/2025, 477.58 €
-- 2) FAC-2026-3056BC : 16/11–11/12/2025, virement 13/01/2026, 707.49 €
-- 3) FAC-2026-000003 : 06/12–18/12/2025, virement 04/02/2026, 518.62 €
-- 4) FAC-2026-000008 : 05/01–11/01/2026, virement 05/03/2026, 575.32 €  ← dernière (05/03/26)

-- ========== 1) Supprimer les anciens virements 99 SF (éviter doublons) ==========
DELETE FROM restaurant_transfers
WHERE restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1);

-- ========== 2) Insérer les 4 virements (ordre chronologique) ==========
INSERT INTO restaurant_transfers (restaurant_id, restaurant_name, amount, transfer_date, period_start, period_end, status, notes)
SELECT id, nom, 477.58, '2025-12-10'::date, '2025-11-16'::date, '2025-12-06'::date, 'completed', 'FAC-2025-589248 (24 cmd 16/11–06/12/2025)'
FROM restaurants WHERE (nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%') LIMIT 1;

INSERT INTO restaurant_transfers (restaurant_id, restaurant_name, amount, transfer_date, period_start, period_end, status, notes)
SELECT id, nom, 707.49, '2026-01-13'::date, '2025-11-16'::date, '2025-12-11'::date, 'completed', 'FAC-2026-3056BC (40 cmd 16/11–11/12/2025)'
FROM restaurants WHERE (nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%') LIMIT 1;

INSERT INTO restaurant_transfers (restaurant_id, restaurant_name, amount, transfer_date, period_start, period_end, status, notes)
SELECT id, nom, 518.62, '2026-02-04'::date, '2025-12-06'::date, '2025-12-18'::date, 'completed', 'FAC-2026-000003 (30 cmd 06/12–18/12/2025)'
FROM restaurants WHERE (nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%') LIMIT 1;

INSERT INTO restaurant_transfers (restaurant_id, restaurant_name, amount, transfer_date, period_start, period_end, status, notes)
SELECT id, nom, 575.32, '2026-03-05'::date, '2026-01-05'::date, '2026-01-11'::date, 'completed', 'FAC-2026-000008 (26 cmd 05–11/01/2026)'
FROM restaurants WHERE (nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%') LIMIT 1;

-- ========== 3) Exclure du comptage toutes les commandes 99 SF avant le 05/03/2026 (déjà couvertes par le dernier virement) ==========
UPDATE commandes
SET statut = 'annulee', payment_status = 'cancelled', updated_at = NOW()
WHERE restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1)
  AND (statut = 'livree' OR (statut IS NOT NULL AND statut != 'annulee'))
  AND (payment_status IN ('paid', 'succeeded') OR payment_status IS NULL)
  AND created_at < '2026-03-05';

-- ========== 4) RÉSULTAT : ce que tu lui dois depuis le dernier virement (05/03/2026) ==========
-- (Commandes à partir du 05/03/2026 uniquement ; les 4 virements = 2278.91 € déjà versés.)
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
  d.nb_cmd AS nb_commandes_depuis_05_mars_2026,
  ROUND(d.total_du::numeric, 2) AS total_du_depuis_derniere_facture_eur,
  ROUND(COALESCE(v.total_vire, 0)::numeric, 2) AS total_deja_vire_eur,
  ROUND(GREATEST(0, (d.total_du - COALESCE(v.total_vire, 0)))::numeric, 2) AS reste_a_payer_eur
FROM dues d
LEFT JOIN virements v ON v.restaurant_id = d.rid;
