-- Empêcher les bascules "fantômes" de ferme_manuellement / ouvert_manuellement
-- Toute modification de ces 2 colonnes doit fournir une preuve explicite (by + at).

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS manual_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_status_updated_by uuid;

COMMENT ON COLUMN public.restaurants.manual_status_updated_at IS 'Horodatage de la dernière action manuelle Ouvrir/Fermer (anti-flip)';
COMMENT ON COLUMN public.restaurants.manual_status_updated_by IS 'User id ayant déclenché la dernière action manuelle Ouvrir/Fermer (anti-flip)';

-- Backfill (ne change pas le statut, juste la traçabilité)
UPDATE public.restaurants
SET
  manual_status_updated_at = COALESCE(manual_status_updated_at, updated_at, now()),
  manual_status_updated_by = COALESCE(manual_status_updated_by, user_id)
WHERE manual_status_updated_at IS NULL OR manual_status_updated_by IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_manual_status_change_proof()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_changed boolean;
  proof_ok boolean;
BEGIN
  status_changed :=
    (OLD.ferme_manuellement IS DISTINCT FROM NEW.ferme_manuellement)
    OR (OLD.ouvert_manuellement IS DISTINCT FROM NEW.ouvert_manuellement);

  IF NOT status_changed THEN
    RETURN NEW;
  END IF;

  proof_ok :=
    NEW.manual_status_updated_at IS NOT NULL
    AND NEW.manual_status_updated_by IS NOT NULL
    AND (OLD.manual_status_updated_at IS DISTINCT FROM NEW.manual_status_updated_at
         OR OLD.manual_status_updated_by IS DISTINCT FROM NEW.manual_status_updated_by)
    AND NEW.manual_status_updated_at >= (now() - interval '10 minutes');

  IF NOT proof_ok THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Changement de statut manuel refusé: missing manual_status_updated_* proof',
      HINT = 'Mettre à jour manual_status_updated_at/by dans la même requête que ferme_manuellement/ouvert_manuellement.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_manual_status_change_proof ON public.restaurants;
CREATE TRIGGER trigger_enforce_manual_status_change_proof
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_manual_status_change_proof();

