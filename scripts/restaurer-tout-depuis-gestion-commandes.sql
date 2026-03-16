-- =============================================================================
-- RESTAURER TOUT AU PROPRE – Une seule source de vérité : la table "commandes"
-- =============================================================================
-- La "Gestion des commandes" (Admin) affiche l’ensemble des commandes CVN'EAT.
-- Le tableau de bord et les stats (CA CVN'EAT, CA Livreur, etc.) se basent sur
-- les commandes payées + livrées de cette même table. Ce script remet en état
-- les lignes qui avaient été marquées annulées à tort (sans remboursement Stripe),
-- pour qu’il n’y ait plus de perte de données et que les chiffres soient à jour.
--
-- À exécuter dans Supabase > SQL Editor.
-- =============================================================================

-- 1) Restaurer en "livrée + payée" les commandes 99 Street Food (avant 05/03/2026)
--    qui avaient été mises en annulée pour le calcul "reste à payer", mais qui
--    doivent compter dans le CA global (pas de remboursement Stripe).
UPDATE commandes
SET statut = 'livree', payment_status = 'paid', updated_at = NOW()
WHERE restaurant_id = (
  SELECT id FROM restaurants
  WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%'
  LIMIT 1
)
  AND statut = 'annulee'
  AND (payment_status = 'cancelled' OR payment_status IS NULL)
  AND (stripe_refund_id IS NULL AND refunded_at IS NULL)
  AND created_at < '2026-03-05';

-- 2) Ne pas toucher aux 3 commandes 99 SF qu’on a volontairement annulées "ce soir-là"
--    (elles restent annulées ; si besoin, les exclure par ID dans un script dédié).

-- 3) Vérification : nombre de commandes payées + livrées (aligné avec la gestion des commandes)
SELECT
  COUNT(*) FILTER (WHERE c.statut = 'livree') AS nb_livrees,
  COUNT(*) FILTER (WHERE c.payment_status IN ('paid', 'succeeded')) AS nb_payees,
  COUNT(*) FILTER (WHERE c.statut = 'livree' AND c.payment_status IN ('paid', 'succeeded')) AS nb_livrees_et_payees
FROM commandes c;
