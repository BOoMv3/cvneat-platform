-- 99 Street Food : voir ce qui est compté et exclure les commandes qui ne devraient pas l'être
-- Le dashboard calcule "ce que tu leur dois" = somme des commandes livrées+payées moins les virements enregistrés.

-- ========== 0) CORRECTION DEPUIS FACTURE FAC-2026-000008 (virement 575.32€ du 05/03/2026, période 05–11/01/2026) ==========
-- Tu étais à jour jusqu'à cette date. On fait en 2 étapes :
-- A) Enregistrer le virement 575.32€
-- B) Exclure du comptage toutes les commandes 99 SF avant le 05/03/2026 (déjà couvertes par le dernier virement)

-- 0A) Enregistrer le virement (facture FAC-2026-000008). Si déjà enregistré, commente ce bloc.
INSERT INTO restaurant_transfers (restaurant_id, restaurant_name, amount, transfer_date, period_start, period_end, status, notes)
SELECT id, nom, 575.32, '2026-03-05'::date, '2026-01-05'::date, '2026-01-11'::date, 'completed', 'Facture FAC-2026-000008 (26 cmd 05–11/01/2026)'
FROM restaurants
WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%'
LIMIT 1;

-- 0B) Exclure les commandes avant le 05/03/2026 (ne plus les compter dans le "dû")
UPDATE commandes
SET statut = 'annulee', payment_status = 'cancelled', updated_at = NOW()
WHERE restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1)
  AND statut = 'livree'
  AND created_at < '2026-03-05';

-- ========== 1) RÉSUMÉ par mois (nombre de commandes + part restaurant) ==========
SELECT
  to_char(c.created_at, 'YYYY-MM') AS mois,
  COUNT(*) AS nb_commandes,
  ROUND(SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS part_restaurant_eur
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'livree'
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
GROUP BY to_char(c.created_at, 'YYYY-MM')
ORDER BY mois ASC;

-- ========== 2) TOTAL + ce que tu leur dois (reste à payer) ==========
SELECT
  r.nom,
  COUNT(*) AS nb_commandes,
  ROUND(SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS total_du_restaurant,
  (SELECT ROUND(COALESCE(SUM(rt.amount), 0)::numeric, 2)
   FROM restaurant_transfers rt
   WHERE rt.restaurant_id = r.id AND rt.status = 'completed') AS deja_verse,
  ROUND((SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric
    - COALESCE((SELECT SUM(rt.amount) FROM restaurant_transfers rt WHERE rt.restaurant_id = r.id AND rt.status = 'completed'), 0), 2) AS reste_a_payer
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE (r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%')
  AND c.statut = 'livree'
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
GROUP BY r.id, r.nom;

-- ========== 3a) EXCLURE par date : toutes les commandes AVANT une date (à adapter) ==========
-- Décommente et mets la date en dessous : tout ce qui est avant sera remis en annulée.
-- Exemple : garder seulement à partir de mars 2025 → created_at < '2025-03-01'
/*
UPDATE commandes
SET statut = 'annulee', payment_status = 'cancelled', updated_at = NOW()
WHERE restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' LIMIT 1)
  AND statut = 'livree'
  AND created_at < '2025-03-01';
*/

-- ========== 3b) EXCLURE des commandes par IDs (si tu as une liste précise) ==========
/*
UPDATE commandes
SET statut = 'annulee', payment_status = 'cancelled', updated_at = NOW()
WHERE id IN ('ID1', 'ID2') AND restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' LIMIT 1);
*/

-- ========== 4) ENREGISTRER un virement déjà effectué (pour baisser "reste à payer") ==========
-- Remplace MONTANT (ex: 500.00) et DATE (ex: '2025-02-15').
/*
INSERT INTO restaurant_transfers (restaurant_id, restaurant_name, amount, transfer_date, status, notes)
SELECT id, nom, 500.00, '2025-02-15'::date, 'completed', 'Virement déjà effectué - rattrapage'
FROM restaurants
WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%'
LIMIT 1;
*/
