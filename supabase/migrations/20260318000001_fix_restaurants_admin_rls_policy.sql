-- Fix policy: allow admins (public.users.role = 'admin') to update restaurants
-- The previous policy relied on auth.users raw_user_meta_data which is not used in this project.

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurants_admin_write" ON public.restaurants;

CREATE POLICY "restaurants_admin_write" ON public.restaurants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  );

