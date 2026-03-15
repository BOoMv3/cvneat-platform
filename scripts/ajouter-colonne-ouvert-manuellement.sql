-- À exécuter dans Supabase → SQL Editor si la carte établissement affiche "Fermé" alors que vous avez cliqué "Ouvrir"
-- 1) Ajouter la colonne si elle n'existe pas
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ouvert_manuellement boolean DEFAULT false;
COMMENT ON COLUMN restaurants.ouvert_manuellement IS 'Si true, restaurant affiché ouvert sur la carte (partenaire a cliqué Ouvrir)';

-- 2) Ouvrir manuellement La Bonne Pâte, Deliss King, Dolce Vita (adapter les noms si besoin)
UPDATE restaurants
SET ouvert_manuellement = true, ferme_manuellement = false, updated_at = NOW()
WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%bonne pate%'
   OR nom ILIKE '%deliss king%' OR nom ILIKE '%deliss%'
   OR nom ILIKE '%dolce vita%';

-- Vérification
SELECT id, nom, ferme_manuellement, ouvert_manuellement FROM restaurants
WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%deliss%' OR nom ILIKE '%dolce vita%';
