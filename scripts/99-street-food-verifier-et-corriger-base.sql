-- =============================================================================
-- 99 STREET FOOD – Vérifier et corriger la base (sans limite artificielle)
-- =============================================================================
-- 0) Diagnostic : état actuel (nb commandes livrées, mauvaise affectation, doublons, remboursées)
-- 1) Lister les commandes dont les articles (menus) appartiennent à un AUTRE restaurant
-- 1b) Corriger restaurant_id sur ces commandes (les réaffecter au bon resto)
-- 1c) Créer la table commandes_payout_exclude si elle n'existe pas (à exécuter une fois avant les blocs 2 et 3)
-- 2) Doublons (même date, total, user_id) : exclure du calcul (commandes_payout_exclude)
-- 3) Commandes remboursées (stripe_refund_id / refunded_at) : exclure du calcul
-- 4) Résultat final : nb commandes et montant dû après corrections
--
-- Si la page Admin > Paiements / Virements affiche toujours 180 commandes / 1466€ :
--   1) Exécuter le bloc 1c (créer la table), puis le bloc 2 (insérer les 46 doublons), puis le bloc 3.
--   2) Vérifier : SELECT COUNT(*) FROM commandes_payout_exclude;  → doit retourner 46 (ou plus si bloc 3 a ajouté des lignes).
--   3) Rafraîchir la page (F5). La page lit cette table pour exclure les commandes du calcul.
-- Exécuter bloc par bloc dans Supabase SQL Editor.
-- =============================================================================

-- ----- 0) DIAGNOSTIC : état actuel 99 SF -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
),
livrees AS (
  SELECT c.id FROM commandes c, id_99
  WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
),
mauvais_resto AS (
  SELECT DISTINCT c.id FROM commandes c
  JOIN details_commande dc ON dc.commande_id = c.id
  JOIN menus m ON m.id = dc.plat_id
  WHERE c.restaurant_id = (SELECT id FROM id_99) AND m.restaurant_id != (SELECT id FROM id_99)
    AND c.statut = 'livree' AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
),
avec_rn AS (
  SELECT c.id, ROW_NUMBER() OVER (PARTITION BY (c.created_at AT TIME ZONE 'Europe/Paris')::date, c.total, c.user_id ORDER BY c.created_at, c.id) AS rn
  FROM commandes c, id_99
  WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
),
doublons AS ( SELECT id FROM avec_rn WHERE rn > 1 ),
remboursees AS (
  SELECT c.id FROM commandes c, id_99
  WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
    AND (c.stripe_refund_id IS NOT NULL OR c.refunded_at IS NOT NULL)
)
SELECT
  (SELECT COUNT(*) FROM livrees) AS total_livrees_99sf,
  (SELECT COUNT(*) FROM mauvais_resto) AS commandes_mauvais_restaurant_id,
  (SELECT COUNT(*) FROM doublons) AS commandes_en_doublon_a_exclure,
  (SELECT COUNT(*) FROM remboursees) AS commandes_remboursees_a_exclure;

-- ----- 1) Commandes qui ont restaurant_id = 99 SF mais dont les menus sont d'un autre resto -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
)
SELECT c.id AS commande_id, c.restaurant_id AS actuel_99sf, m.restaurant_id AS restaurant_des_menus, r.nom AS vrai_restaurant
FROM commandes c
JOIN details_commande dc ON dc.commande_id = c.id
JOIN menus m ON m.id = dc.plat_id
JOIN restaurants r ON r.id = m.restaurant_id
WHERE c.restaurant_id = (SELECT id FROM id_99)
  AND c.statut = 'livree'
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
  AND m.restaurant_id != (SELECT id FROM id_99)
GROUP BY c.id, c.restaurant_id, m.restaurant_id, r.nom;

-- 1b) Si le bloc 1 a retourné des lignes : corriger restaurant_id (affecter le resto des menus)
-- Exécuter ce bloc seulement après avoir vérifié le résultat du bloc 1.
UPDATE commandes c
SET restaurant_id = (
  SELECT m.restaurant_id FROM details_commande dc
  JOIN menus m ON m.id = dc.plat_id
  WHERE dc.commande_id = c.id
  LIMIT 1
)
WHERE c.restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' LIMIT 1)
  AND c.statut = 'livree'
  AND EXISTS (
    SELECT 1 FROM details_commande dc2
    JOIN menus m2 ON m2.id = dc2.plat_id
    WHERE dc2.commande_id = c.id AND m2.restaurant_id != c.restaurant_id
  );

-- ----- 1c) Créer la table commandes_payout_exclude (exécuter une fois si la table n'existe pas) -----
CREATE TABLE IF NOT EXISTS commandes_payout_exclude (
  commande_id UUID PRIMARY KEY REFERENCES commandes(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- 2) Doublons : même (date, total, user_id) – on exclut les doublons du calcul -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
),
livrees AS (
  SELECT c.id, (c.created_at AT TIME ZONE 'Europe/Paris')::date AS d, c.total, c.user_id,
    ROW_NUMBER() OVER (PARTITION BY (c.created_at AT TIME ZONE 'Europe/Paris')::date, c.total, c.user_id ORDER BY c.created_at, c.id) AS rn
  FROM commandes c, id_99
  WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
    AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
)
INSERT INTO commandes_payout_exclude (commande_id, reason)
SELECT id, 'Doublon 99 SF (date+total+user_id)'
FROM livrees WHERE rn > 1
ON CONFLICT (commande_id) DO NOTHING;

-- ----- 2bis) Vérifier : doit afficher 46 (ou le nombre de doublons exclus) -----
-- SELECT COUNT(*) AS nb_exclus FROM commandes_payout_exclude;

-- ----- 3) Commandes remboursées (stripe_refund_id ou refunded_at) : exclure du calcul -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
)
INSERT INTO commandes_payout_exclude (commande_id, reason)
SELECT c.id, 'Remboursée (stripe_refund_id ou refunded_at)'
FROM commandes c, id_99
WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
  AND (c.stripe_refund_id IS NOT NULL OR c.refunded_at IS NOT NULL)
ON CONFLICT (commande_id) DO NOTHING;

-- ----- 4) Résultat : nombre de commandes et montant après corrections -----
WITH id_99 AS (
  SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1
)
SELECT
  COUNT(*) AS nb_commandes,
  ROUND(SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS total_du_eur
FROM commandes c, id_99
WHERE c.restaurant_id = id_99.id AND c.statut = 'livree'
  AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)
  AND NOT EXISTS (SELECT 1 FROM commandes_payout_exclude e WHERE e.commande_id = c.id);
