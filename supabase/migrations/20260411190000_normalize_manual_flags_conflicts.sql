-- Nettoyage : impossible d’être « fermé manuellement » et « ouvert manuellement » à la fois.
-- Le trigger enforce_manual_status_change_proof exigerait manual_status_* sur tout UPDATE de ces colonnes :
-- on le désactive brièvement pour ce correctif de masse uniquement.

BEGIN;

ALTER TABLE public.restaurants DISABLE TRIGGER trigger_enforce_manual_status_change_proof;

UPDATE public.restaurants
SET ouvert_manuellement = false
WHERE ferme_manuellement IS TRUE
  AND ouvert_manuellement IS TRUE;

ALTER TABLE public.restaurants ENABLE ALWAYS TRIGGER trigger_enforce_manual_status_change_proof;

COMMIT;
