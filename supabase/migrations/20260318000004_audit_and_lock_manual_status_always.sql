-- Audit + verrouillage "ALWAYS" pour stopper les flips fantômes
-- Objectif: tracer ET empêcher toute modification de ferme_manuellement / ouvert_manuellement
-- même si des process tournent avec session_replication_role = replica.

CREATE TABLE IF NOT EXISTS public.restaurant_manual_status_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  old_ferme boolean,
  new_ferme boolean,
  old_ouvert boolean,
  new_ouvert boolean,
  manual_status_updated_at timestamptz,
  manual_status_updated_by uuid,
  actor_role text,
  actor_sub text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_manual_status_audit_restaurant
  ON public.restaurant_manual_status_audit(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_manual_status_audit_changed_at
  ON public.restaurant_manual_status_audit(changed_at DESC);

COMMENT ON TABLE public.restaurant_manual_status_audit IS
  'Trace chaque modification de ferme_manuellement/ouvert_manuellement + preuve + acteur (JWT sub si dispo).';

CREATE OR REPLACE FUNCTION public.log_manual_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_sub text;
BEGIN
  IF (OLD.ferme_manuellement IS DISTINCT FROM NEW.ferme_manuellement)
     OR (OLD.ouvert_manuellement IS DISTINCT FROM NEW.ouvert_manuellement) THEN
    actor_sub := current_setting('request.jwt.claim.sub', true);
    INSERT INTO public.restaurant_manual_status_audit (
      restaurant_id,
      old_ferme, new_ferme,
      old_ouvert, new_ouvert,
      manual_status_updated_at,
      manual_status_updated_by,
      actor_role,
      actor_sub
    )
    VALUES (
      NEW.id,
      OLD.ferme_manuellement, NEW.ferme_manuellement,
      OLD.ouvert_manuellement, NEW.ouvert_manuellement,
      NEW.manual_status_updated_at,
      NEW.manual_status_updated_by,
      current_user,
      actor_sub
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_manual_status ON public.restaurants;
CREATE TRIGGER trigger_log_manual_status
  AFTER UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE PROCEDURE public.log_manual_status_change();

-- Rendre les triggers "ALWAYS" (exécutés même en mode replica)
ALTER TABLE public.restaurants ENABLE ALWAYS TRIGGER trigger_log_manual_status;
ALTER TABLE public.restaurants ENABLE ALWAYS TRIGGER trigger_enforce_manual_status_change_proof;

