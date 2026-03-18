-- Empêche les "phantom closes" via service role (jobs/scripts).
-- Autorise les mises à jour depuis le dashboard (JWT role=authenticated) et depuis l'éditeur SQL (pas de claim).

BEGIN;

CREATE OR REPLACE FUNCTION public.block_service_role_manual_close()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
BEGIN
  -- Ne s'applique que si la valeur change réellement
  IF NEW.ferme_manuellement IS NOT DISTINCT FROM OLD.ferme_manuellement THEN
    RETURN NEW;
  END IF;

  -- Récupérer le rôle depuis les JWT claims PostgREST (peut être NULL en SQL editor)
  jwt_role := current_setting('request.jwt.claim.role', true);

  -- Bloquer explicitement les updates venant du service role (source la plus probable des flips)
  IF jwt_role = 'service_role' THEN
    RAISE EXCEPTION 'Changement de ferme_manuellement bloqué (service_role interdit)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_service_role_manual_close ON public.restaurants;
CREATE TRIGGER trg_block_service_role_manual_close
BEFORE UPDATE OF ferme_manuellement ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.block_service_role_manual_close();

COMMIT;

