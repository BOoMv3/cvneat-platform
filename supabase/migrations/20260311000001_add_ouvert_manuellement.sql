-- Permet d'afficher un restaurant comme OUVERT même hors horaires (override)
-- Quand le partenaire clique "Ouvrir" sur son dashboard
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ouvert_manuellement boolean DEFAULT false;
COMMENT ON COLUMN restaurants.ouvert_manuellement IS 'Si true, restaurant affiché ouvert même hors horaires';
