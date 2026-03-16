-- ========== RESTAURATION (à utiliser SEULEMENT si tu as exécuté le script 99-street-food-remettre-au-propre
--            et que tu veux revenir en arrière) ==========
-- Prérequis : avoir exécuté avant SAVE-avant-99sf-remettre-propre.sql pour créer les tables de backup.

-- 1) Remettre statut et payment_status des commandes 99 SF comme dans le backup
UPDATE commandes c
SET
  statut = b.statut,
  payment_status = b.payment_status,
  updated_at = b.updated_at
FROM commandes_backup_99sf_20260315 b
WHERE c.id = b.id AND c.restaurant_id = b.restaurant_id;

-- 2) Supprimer les 4 virements qu'on avait insérés
DELETE FROM restaurant_transfers
WHERE restaurant_id = (SELECT id FROM restaurants WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%' LIMIT 1);

-- 3) Ré-insérer les virements depuis le backup (colonnes alignées sur la table d'origine)
INSERT INTO restaurant_transfers (id, restaurant_id, restaurant_name, amount, transfer_date, reference_number, notes, period_start, period_end, status, created_by, created_at, updated_at)
SELECT id, restaurant_id, restaurant_name, amount, transfer_date, reference_number, notes, period_start, period_end, status, created_by, created_at, updated_at
FROM restaurant_transfers_backup_99sf_20260315;
