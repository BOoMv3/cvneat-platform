-- Rôle comptable : lecture des données financières (factures, virements, commandes livrées)

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'restaurant', 'delivery', 'comptable'));

-- restaurant_transfers : lecture comptable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'restaurant_transfers') THEN
    DROP POLICY IF EXISTS "restaurant_transfers_comptable_select" ON public.restaurant_transfers;
    CREATE POLICY "restaurant_transfers_comptable_select" ON public.restaurant_transfers
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'comptable')
      );
  END IF;
END $$;

-- delivery_transfers : lecture comptable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_transfers') THEN
    DROP POLICY IF EXISTS "delivery_transfers_comptable_select" ON public.delivery_transfers;
    CREATE POLICY "delivery_transfers_comptable_select" ON public.delivery_transfers
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'comptable')
      );
  END IF;
END $$;
