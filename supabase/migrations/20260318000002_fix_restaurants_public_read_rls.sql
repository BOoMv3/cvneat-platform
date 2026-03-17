-- CRITIQUE: garantir que la table restaurants reste lisible
-- Si restaurants_public_read est absent, les partenaires ne peuvent plus charger leur restaurant
-- et l'app leur demande de "recréer la fiche établissement".

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurants_public_read" ON public.restaurants;
CREATE POLICY "restaurants_public_read" ON public.restaurants
  FOR SELECT
  USING (true);

