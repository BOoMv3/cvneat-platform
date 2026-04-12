-- Permettre à Supabase Realtime d’émettre les UPDATE sur public.restaurants
-- (ouverture / fermeture manuelle, prépa, etc.) pour resynchroniser le dashboard
-- partenaire et la fiche client sans dépendre du cache HTTP / SW.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'restaurants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
  END IF;
END $$;
