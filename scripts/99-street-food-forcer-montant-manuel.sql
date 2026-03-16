-- Forcer le "reste à payer" 99 Street Food à un montant manuel (ex. 0 si tu es à jour)
-- À exécuter dans Supabase SQL Editor.
-- Prérequis : avoir exécuté la migration 20260316000000_restaurant_remaining_to_pay_override.sql
-- (ajout de la colonne remaining_to_pay_override sur la table restaurants)

-- Mettre 0 € pour 99 Street Food (tu es sûr d'être à jour)
UPDATE restaurants
SET remaining_to_pay_override = 0
WHERE nom ILIKE '%99 street%' OR nom ILIKE '%99street%' OR nom ILIKE '%99 street food%';

-- Pour remettre le calcul automatique plus tard (supprimer le montant manuel) :
-- UPDATE restaurants SET remaining_to_pay_override = NULL WHERE nom ILIKE '%99 street%';
