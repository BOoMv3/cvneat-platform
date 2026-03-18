-- Autoriser un partenaire à ouvrir/fermer SON restaurant via RLS
-- Nécessaire depuis le durcissement du trigger (JWT sub obligatoire).

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurants_owner_write" ON public.restaurants;

CREATE POLICY "restaurants_owner_write" ON public.restaurants
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('restaurant', 'partner')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('restaurant', 'partner')
    )
  );

