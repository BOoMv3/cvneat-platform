-- Script SQL pour ajouter les champs Google Places à la table restaurants
-- Ce script permet de stocker les informations Google pour les restaurants

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS google_place_id TEXT,
ADD COLUMN IF NOT EXISTS google_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS google_reviews_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS google_last_updated TIMESTAMP WITH TIME ZONE;

-- Créer un index sur google_place_id pour les recherches
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);

-- Commentaire pour documenter les colonnes
COMMENT ON COLUMN restaurants.google_place_id IS 'Identifiant unique Google Places pour le restaurant';
COMMENT ON COLUMN restaurants.google_rating IS 'Note moyenne Google (0-5)';
COMMENT ON COLUMN restaurants.google_reviews_count IS 'Nombre total d\'avis Google';
COMMENT ON COLUMN restaurants.google_last_updated IS 'Date de dernière mise à jour depuis Google';

