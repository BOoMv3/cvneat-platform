-- Table d'audit pour tracer qui modifie ferme_manuellement (détecter bascules intempestives)
CREATE TABLE IF NOT EXISTS public.restaurant_ferme_manuellement_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  old_value boolean,
  new_value boolean,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ferme_manuellement_audit_restaurant
  ON public.restaurant_ferme_manuellement_audit(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ferme_manuellement_audit_changed_at
  ON public.restaurant_ferme_manuellement_audit(changed_at DESC);

COMMENT ON TABLE public.restaurant_ferme_manuellement_audit IS 'Trace chaque modification de restaurants.ferme_manuellement pour debug des fermetures intempestives';

-- Trigger : à chaque UPDATE sur restaurants, si ferme_manuellement a changé, on log
CREATE OR REPLACE FUNCTION public.log_ferme_manuellement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.ferme_manuellement IS DISTINCT FROM NEW.ferme_manuellement THEN
    INSERT INTO public.restaurant_ferme_manuellement_audit (restaurant_id, old_value, new_value)
    VALUES (NEW.id, OLD.ferme_manuellement, NEW.ferme_manuellement);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_ferme_manuellement ON public.restaurants;
CREATE TRIGGER trigger_log_ferme_manuellement
  AFTER UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE PROCEDURE public.log_ferme_manuellement_change();
