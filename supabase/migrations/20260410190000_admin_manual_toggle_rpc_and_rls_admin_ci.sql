-- 1) Toggle ouvert/fermé manuel depuis le dashboard admin : RPC SECURITY DEFINER
--    (contourne la RLS si la politique admin ne matche pas, ex. role 'Admin' vs 'admin').
-- 2) Politique restaurants_admin_write : role admin en lower(trim(...)).

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_set_restaurant_manual_status(
  p_restaurant_id uuid,
  p_ferme_manuellement boolean,
  p_ouvert_manuellement boolean
)
RETURNS SETOF public.restaurants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = uid
      AND lower(trim(coalesce(u.role::text, ''))) = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès refusé: droits administrateur requis';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = p_restaurant_id) THEN
    RAISE EXCEPTION 'Restaurant introuvable';
  END IF;

  RETURN QUERY
  UPDATE public.restaurants r
  SET
    ferme_manuellement = p_ferme_manuellement,
    ouvert_manuellement = p_ouvert_manuellement,
    updated_at = timezone('utc', now()),
    manual_status_updated_at = timezone('utc', now()),
    manual_status_updated_by = r.user_id
  WHERE r.id = p_restaurant_id
  RETURNING r.*;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_restaurant_manual_status(uuid, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_restaurant_manual_status(uuid, boolean, boolean) TO authenticated;

DROP POLICY IF EXISTS "restaurants_admin_write" ON public.restaurants;
CREATE POLICY "restaurants_admin_write" ON public.restaurants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(trim(coalesce(u.role::text, ''))) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(trim(coalesce(u.role::text, ''))) = 'admin'
    )
  );

COMMIT;
