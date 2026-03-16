-- URGENCE : stopper le délire des tablettes + côté livreurs (remettre tout au propre)
-- Le script de restauration avait remis en "en_attente" des centaines d'anciennes commandes.
-- Ce script : annule ces commandes, libère les livreurs (livreur_id = NULL), ferme 99 SF.
-- À exécuter dans Supabase SQL Editor.

-- 1) Annuler toutes les commandes "en_attente" créées AVANT aujourd'hui (Paris)
--    + libérer les livreurs (livreur_id = NULL) pour que les commandes disparaissent côté app livreur
UPDATE commandes
SET statut = 'annulee',
    livreur_id = NULL,
    payment_status = CASE
        WHEN payment_status IN ('paid', 'succeeded') THEN 'refunded'
        ELSE 'cancelled'
    END,
    updated_at = NOW()
WHERE statut = 'en_attente'
  AND (created_at AT TIME ZONE 'Europe/Paris')::date < (NOW() AT TIME ZONE 'Europe/Paris')::date;

-- 2) Fermer 99 Street Food
UPDATE restaurants
SET ferme_manuellement = true, updated_at = NOW()
WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%';

-- 3) Annuler les commandes en_attente de CE SOIR pour 99 Street Food uniquement
--    + libérer les livreurs (livreur_id = NULL)
UPDATE commandes
SET statut = 'annulee',
    livreur_id = NULL,
    payment_status = CASE
        WHEN payment_status IN ('paid', 'succeeded') THEN 'refunded'
        ELSE 'cancelled'
    END,
    updated_at = NOW()
WHERE restaurant_id IN (
    SELECT id FROM restaurants
    WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%'
)
  AND statut = 'en_attente'
  AND (created_at AT TIME ZONE 'Europe/Paris')::date = (NOW() AT TIME ZONE 'Europe/Paris')::date;

-- 4) Nettoyage : libérer le livreur sur TOUTES les commandes annulées (au cas où il en reste avec livreur_id)
UPDATE commandes
SET livreur_id = NULL, updated_at = NOW()
WHERE statut = 'annulee' AND livreur_id IS NOT NULL;

-- Vérif : combien restent en_attente (normalement peu, seulement les vraies du jour hors 99 SF)
SELECT COUNT(*) AS restantes_en_attente FROM commandes WHERE statut = 'en_attente';

-- Liste des commandes encore en_attente (pour contrôle)
SELECT c.id, r.nom AS restaurant, c.created_at, c.payment_status
FROM commandes c
JOIN restaurants r ON r.id = c.restaurant_id
WHERE c.statut = 'en_attente'
ORDER BY c.created_at DESC;
