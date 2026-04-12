-- Partenaires dont public.users.role est en casse mixte (ex. "Partner") : la politique
-- restaurants_owner_write refusait l'UPDATE (ferme_manuellement) car IN ('restaurant','partner') était strict.

BEGIN;

DROP POLICY IF EXISTS "restaurants_owner_write" ON public.restaurants;

CREATE POLICY "restaurants_owner_write" ON public.restaurants
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(trim(coalesce(u.role::text, ''))) IN ('restaurant', 'partner')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND lower(trim(coalesce(u.role::text, ''))) IN ('restaurant', 'partner')
    )
  );

COMMIT;
