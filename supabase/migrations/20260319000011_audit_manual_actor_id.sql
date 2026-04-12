-- Enrichit l'audit pour identifier précisément quel user déclenche les flips
-- via manual_status_updated_by / manual_status_updated_at.

BEGIN;

ALTER TABLE public.restaurants_status_audit
  ADD COLUMN IF NOT EXISTS manual_status_updated_by uuid,
  ADD COLUMN IF NOT EXISTS manual_status_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.log_ferme_manuellement_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ferme_manuellement IS DISTINCT FROM OLD.ferme_manuellement THEN
    INSERT INTO public.restaurants_status_audit (
      restaurant_id,
      old_ferme_manuellement,
      new_ferme_manuellement,
      jwt_role,
      jwt_sub,
      jwt_email,
      db_user,
      manual_status_updated_by,
      manual_status_updated_at
    ) VALUES (
      NEW.id,
      OLD.ferme_manuellement,
      NEW.ferme_manuellement,
      current_setting('request.jwt.claim.role', true),
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claim.email', true),
      current_user,
      NEW.manual_status_updated_by,
      NEW.manual_status_updated_at
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

