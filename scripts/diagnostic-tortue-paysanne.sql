-- Diagnostic "La Tortue Paysanne" (pourquoi affichée ouverte ?)
-- Exécuter dans Supabase → SQL Editor

SELECT id, nom, ferme_manuellement, horaires, updated_at
FROM restaurants
WHERE nom ILIKE '%tortue%' OR nom ILIKE '%tortu%' OR nom ILIKE '%paysanne%';

-- Si le restaurant a horaires avec "ouvert: true" sans plages valides, il était affiché ouvert.
-- Correctif : fermer manuellement jusqu'à ce que les horaires soient renseignés, ou mettre à jour horaires.
-- Exemple pour forcer fermé (à adapter avec le bon id si besoin) :
-- UPDATE restaurants SET ferme_manuellement = true, updated_at = NOW() WHERE nom ILIKE '%tortue paysanne%';
