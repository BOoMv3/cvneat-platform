-- Associé : lecture seule de tout ce que l’admin voit (mêmes SELECT, pas d’écriture).

CREATE OR REPLACE FUNCTION public.is_admin_viewer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(trim(coalesce(u.role::text, ''))) IN ('admin', 'associe')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_writer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND lower(trim(coalesce(u.role::text, ''))) = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin_viewer() IS 'Admin + associé (lecture)';
COMMENT ON FUNCTION public.is_admin_writer() IS 'Admin uniquement (écriture)';

-- Helper: ajoute une policy SELECT viewer si la table existe
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users',
    'commandes',
    'commande_details',
    'restaurants',
    'restaurant_requests',
    'partnership_requests',
    'site_visits',
    'restaurant_transfers',
    'delivery_transfers',
    'delivery_applications',
    'delivery_messages',
    'delivery_dm_threads',
    'delivery_dm_messages',
    'delivery_dm_reads',
    'promo_codes',
    'advertisements',
    'advertising_requests',
    'chat_messages',
    'partner_messages',
    'partner_price_change_notifications',
    'delivery_stats',
    'commandes_payout_exclude',
    'restaurant_manual_status_audit',
    'restaurant_ferme_manuellement_audit',
    'restaurants_status_audit',
    'bugs',
    'complaints',
    'newsletter_subscribers'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS associe_admin_viewer_select ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY associe_admin_viewer_select ON public.%I FOR SELECT USING (public.is_admin_viewer())',
        t
      );
    END IF;
  END LOOP;
END $$;
