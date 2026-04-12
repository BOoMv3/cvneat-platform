-- Verrou final anti-fermetures massives:
-- seul le propriétaire du restaurant peut changer ferme_manuellement / ouvert_manuellement.
-- (Admin ne peut plus toggler ces champs.)

BEGIN;

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
      MESSAGE = 'Changement de statut manuel refusé: preuve invalide',
      HINT = 'Mettre à jour manual_status_updated_at/manual_status_updated_by dans la même requête.';
  END IF;

  -- Owner only: le user qui signe la preuve doit être le propriétaire du restaurant.
  IF NEW.manual_status_updated_by IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Changement de statut manuel refusé: owner uniquement',
      HINT = 'Seul le propriétaire du restaurant peut ouvrir/fermer manuellement.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_manual_status_change_proof ON public.restaurants;
CREATE TRIGGER trigger_enforce_manual_status_change_proof
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_manual_status_change_proof();

ALTER TABLE public.restaurants ENABLE ALWAYS TRIGGER trigger_enforce_manual_status_change_proof;

COMMIT;

