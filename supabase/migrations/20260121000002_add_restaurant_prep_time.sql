-- Ajout temps de préparation déclaratif (partenaire) pour affichage côté client

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS prep_time_updated_at TIMESTAMPTZ;

-- Contraintes de cohérence (si la colonne existe déjà, ne pas recréer la contrainte)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurants_prep_time_minutes_check'
  ) THEN
    ALTER TABLE restaurants
    ADD CONSTRAINT restaurants_prep_time_minutes_check
    CHECK (prep_time_minutes IS NULL OR (prep_time_minutes >= 5 AND prep_time_minutes <= 120));
  END IF;
END $$;

-- Index simple pour les lectures tri/filtre (optionnel mais utile)
CREATE INDEX IF NOT EXISTS idx_restaurants_prep_time_updated_at ON restaurants (prep_time_updated_at);


