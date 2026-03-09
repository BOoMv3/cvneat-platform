-- Offres / promos partenaires : badge affiché sur la fiche restaurant à l'accueil
-- Ex : "Promo", "1 acheté = 1 offert", "Livraison offerte", etc.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS offre_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS offre_label TEXT,
  ADD COLUMN IF NOT EXISTS offre_description TEXT;

COMMENT ON COLUMN restaurants.offre_active IS 'Si true, affiche un badge promo sur la page d''accueil';
COMMENT ON COLUMN restaurants.offre_label IS 'Texte court du badge (ex: Promo, 1 acheté = 1 offert)';
COMMENT ON COLUMN restaurants.offre_description IS 'Description détaillée de l''offre (optionnel)';
