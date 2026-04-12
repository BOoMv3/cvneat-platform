-- Réapplique la règle « propriétaire OU admin » sur les changements ferme_manuellement / ouvert_manuellement.
-- Si seule 20260319000012 (owner only) a été appliquée en prod, le dashboard admin ne peut plus toggler :
-- manual_status_updated_by = admin.id ≠ restaurants.user_id → exception « owner uniquement ».

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
  actor_id uuid;
  actor_role text;
  is_admin boolean;
  is_owner boolean;
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

  actor_id := NEW.manual_status_updated_by;
  SELECT u.role INTO actor_role FROM public.users u WHERE u.id = actor_id;
  is_admin := lower(trim(coalesce(actor_role, ''))) = 'admin';
  is_owner := NEW.user_id = actor_id;

  IF NOT (is_owner OR is_admin) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Changement de statut manuel refusé: acteur non autorisé',
      HINT = 'Seul le propriétaire du restaurant ou un admin peut ouvrir/fermer manuellement.';
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
