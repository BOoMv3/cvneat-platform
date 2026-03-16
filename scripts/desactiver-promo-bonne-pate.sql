-- Désactiver la promo La Bonne Pâte
-- Exécuter dans Supabase → SQL Editor

UPDATE restaurants
SET offre_active = false, offre_label = null, offre_description = null, updated_at = NOW()
WHERE nom ILIKE '%bonne pate%' OR nom ILIKE '%bonne pâte%';

-- Vérification
SELECT id, nom, offre_active, offre_label FROM restaurants WHERE nom ILIKE '%bonne pate%' OR nom ILIKE '%bonne pâte%';
