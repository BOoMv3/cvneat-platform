-- Audit robuste des changements de ferme_manuellement (pour identifier la source des "phantom closes").
-- Log: ancien/nouveau, role JWT, sub JWT, email, current_user, timestamp.

BEGIN;

CREATE TABLE IF NOT EXISTS public.restaurants_status_audit (
  id bigserial PRIMARY KEY,
  restaurant_id uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_ferme_manuellement boolean,
  new_ferme_manuellement boolean,
  jwt_role text,
  jwt_sub text,
  jwt_email text,
  db_user text
);

ALTER TABLE public.restaurants_status_audit ENABLE ROW LEVEL SECURITY;

-- Lecture réservée (adapter si besoin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'restaurants_status_audit' AND policyname = 'audit_admin_read'
  ) THEN
    CREATE POLICY audit_admin_read
      ON public.restaurants_status_audit
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
      ));
  END IF;
END;
$$;

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
      db_user
    ) VALUES (
      NEW.id,
      OLD.ferme_manuellement,
      NEW.ferme_manuellement,
      current_setting('request.jwt.claim.role', true),
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claim.email', true),
      current_user
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ferme_manuellement_change ON public.restaurants;
CREATE TRIGGER trg_log_ferme_manuellement_change
AFTER UPDATE OF ferme_manuellement ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.log_ferme_manuellement_change();

COMMIT;

