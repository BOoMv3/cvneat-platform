-- Confirmation quotidienne d'ouverture par le partenaire (fuseau Europe/Paris côté app).
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS daily_open_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS daily_open_declined_date date;

COMMENT ON COLUMN public.restaurants.daily_open_confirmed_at IS
  'Horodatage de la confirmation « je suis ouvert » du jour (interprété en date Paris).';
COMMENT ON COLUMN public.restaurants.daily_open_declined_date IS
  'Date calendaire Paris où le partenaire a déclaré être fermé pour la journée.';
