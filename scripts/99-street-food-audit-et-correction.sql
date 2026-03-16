-- =============================================================================
-- 99 STREET FOOD – Audit complet + correction (recompte depuis commandes, virements, 05/03/26 → aujourd'hui)
-- =============================================================================
-- À exécuter dans Supabase > SQL Editor. Exécuter bloc par bloc ou tout d'un coup.
-- 1) Diagnostic : recompte de TOUTES les commandes 99 SF (comme en gestion des commandes)
-- 2) Vérification des virements déjà effectués
-- 3) Restauration des commandes mises à tort en "annulée" (sauf les 3 du soir qu'on a volontairement annulées)
-- 4) Sécurisation des 4 virements (ré-insérés si besoin)
-- 5) Résultat final : nombre de commandes et montant dû depuis le 05/03/2026
-- =============================================================================

-- ----- BLOC 1 : ID 99 Street Food -----
DO $$
DECLARE
  id_99 RECORD;
BEGIN
  SELECT id, nom INTO id_99 FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1;
  IF id_99.id IS NOT NULL THEN
    RAISE NOTICE 'Restaurant 99 Street Food : id = %', id_99.id;
  ELSE
    RAISE EXCEPTION '99 Street Food non trouvé';
  END IF;
END $$;

-- ----- BLOC 2 : RECOMPTE (comme en gestion des commandes) -----
-- Toutes les commandes 99 SF par statut et payment_status
SELECT
  'RECOMPTE 99 SF (toutes les commandes)' AS titre,
  c.statut,
  c.payment_status,
  COUNT(*) AS nb
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
GROUP BY c.statut, c.payment_status
ORDER BY c.statut, c.payment_status;

-- Total livrées + payées (ou succeeded) actuellement
SELECT
  'TOTAL livrées ET payées (état actuel)' AS titre,
  COUNT(*) AS nb_commandes,
  ROUND(SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS total_restaurant_payout_eur
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'livree'
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL);

-- Commandes actuellement "annulées" sans remboursement Stripe (celles qu'on va restaurer, sauf les 3 du soir)
SELECT
  'Commandes annulées SANS remboursement Stripe (candidates à restauration)' AS titre,
  COUNT(*) AS nb
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'annulee'
  AND (c.payment_status IN ('cancelled', 'refunded') OR c.payment_status IS NULL)
  AND c.stripe_refund_id IS NULL
  AND c.refunded_at IS NULL;

-- ----- BLOC 3 : Virements déjà effectués (99 SF) -----
SELECT
  'VIREMENTS 99 SF' AS titre,
  rt.transfer_date,
  rt.amount,
  rt.period_start,
  rt.period_end,
  rt.notes
FROM restaurant_transfers rt
JOIN restaurants r ON r.id = rt.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND rt.status = 'completed'
ORDER BY rt.transfer_date;

SELECT
  'TOTAL déjà viré (99 SF)' AS titre,
  ROUND(SUM(rt.amount)::numeric, 2) AS total_eur
FROM restaurant_transfers rt
JOIN restaurants r ON r.id = rt.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND rt.status = 'completed';

-- ----- BLOC 4 : RESTAURATION (remettre en livrée+payée sauf les 3 dernières annulées) -----
-- On restaure toutes les commandes 99 SF qui sont annulées sans remboursement Stripe,
-- SAUF les 3 plus récentes (par created_at) qu'on avait volontairement annulées "ce soir-là".
UPDATE commandes c
SET statut = 'livree', payment_status = 'paid', updated_at = NOW()
FROM restaurants r
WHERE r.id = c.restaurant_id
  AND (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'annulee'
  AND (c.payment_status IN ('cancelled', 'refunded') OR c.payment_status IS NULL)
  AND c.stripe_refund_id IS NULL
  AND c.refunded_at IS NULL
  AND c.id NOT IN (
    SELECT c2.id FROM commandes c2
    JOIN restaurants r2 ON r2.id = c2.restaurant_id
    WHERE (r2.nom ILIKE '%99 street%' OR r2.nom ILIKE '%99street%' OR r2.nom ILIKE '%99 street food%')
      AND c2.statut = 'annulee'
    ORDER BY c2.created_at DESC
    LIMIT 3
  );

-- ----- BLOC 5 : S'assurer que les 4 virements sont bien en base -----
-- Supprimer les virements 99 SF existants pour ré-insérer les 4 factures (éviter doublons)
DELETE FROM restaurant_transfers
WHERE restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1);

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

-- ----- BLOC 6 : RÉSULTAT FINAL – Depuis le 06/03/2026 (lendemain du virement) -----
-- Début du 06/03 à Paris = 05/03 23:00 UTC (on ne compte pas le jour du virement 05/03)
WITH cmd_depuis_06_mars AS (
  SELECT
    c.id,
    c.created_at,
    COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)) AS payout
  FROM commandes c
  JOIN restaurants r ON r.id = c.restaurant_id
  WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
    AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
    AND c.created_at >= '2026-03-05T23:00:00+00'
)
SELECT
  '99 STREET FOOD – Depuis 06/03/2026 (après dernier virement)' AS libelle,
  COUNT(*) AS nb_commandes_depuis_06_mars,
  ROUND(SUM(payout)::numeric, 2) AS montant_du_eur
FROM cmd_depuis_06_mars;

-- Rappel : total déjà viré (les 4 factures)
SELECT
  'Total déjà viré (4 factures)' AS libelle,
  ROUND(SUM(amount)::numeric, 2) AS total_eur
FROM restaurant_transfers rt
JOIN restaurants r ON r.id = rt.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND rt.status = 'completed';
