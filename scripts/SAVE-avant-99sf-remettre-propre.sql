-- ========== SAUVEGARDE AVANT D'EXÉCUTER "99-street-food-remettre-au-propre-toutes-factures.sql" ==========
-- Exécute CE script en premier dans Supabase SQL Editor. Il crée des tables de backup.
-- Si après le script principal tu veux annuler, on pourra te donner un script de restauration.

-- ========== 1) Backup des commandes 99 Street Food (statut, payment_status, etc.) ==========
DROP TABLE IF EXISTS commandes_backup_99sf_20260315;
CREATE TABLE commandes_backup_99sf_20260315 AS
SELECT c.id, c.restaurant_id, c.statut, c.payment_status, c.created_at, c.updated_at,
       c.total, c.frais_livraison, c.commission_amount, c.restaurant_payout
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%';

-- ========== 2) Backup des virements 99 Street Food ==========
DROP TABLE IF EXISTS restaurant_transfers_backup_99sf_20260315;
CREATE TABLE restaurant_transfers_backup_99sf_20260315 AS
SELECT rt.*
FROM restaurant_transfers rt
JOIN restaurants r ON r.id = rt.restaurant_id
WHERE r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%';

-- ========== 3) Diagnostic : nombre de commandes par restaurant (pour comparer) ==========
SELECT
  r.nom AS restaurant,
  COUNT(*) FILTER (WHERE c.statut = 'livree' AND (c.payment_status IN ('paid', 'succeeded') OR c.payment_status IS NULL)) AS livree_payee,
  COUNT(*) FILTER (WHERE c.statut = 'annulee') AS annulee,
  COUNT(*) AS total_commandes
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
GROUP BY r.id, r.nom
ORDER BY r.nom;

-- ========== 4) Détail 99 SF + La Bonne Pâte (pour vérifier) ==========
SELECT
  r.nom,
  c.statut,
  c.payment_status,
  COUNT(*) AS nb,
  ROUND(SUM(COALESCE(c.restaurant_payout, c.total - COALESCE(c.commission_amount, c.total * 0.20)))::numeric, 2) AS part_resto_eur
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE r.nom ILIKE '%99 street%' OR r.nom ILIKE '%99street%' OR r.nom ILIKE '%99 street food%'
   OR r.nom ILIKE '%bonne pâte%' OR r.nom ILIKE '%bonne pate%'
GROUP BY r.nom, c.statut, c.payment_status
ORDER BY r.nom, c.statut;
