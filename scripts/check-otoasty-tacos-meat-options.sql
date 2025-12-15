-- Vérifier les options de viande pour les tacos "O Toasty"
-- Rechercher "Tacos L - 2 Viandes" et vérifier meat_options

SELECT 
  id,
  nom,
  category,
  meat_options,
  typeof(meat_options) as meat_options_type,
  jsonb_typeof(meat_options) as meat_options_jsonb_type,
  CASE 
    WHEN meat_options IS NULL THEN 'NULL'
    WHEN jsonb_typeof(meat_options) = 'array' THEN 'ARRAY'
    WHEN jsonb_typeof(meat_options) = 'object' THEN 'OBJECT'
    ELSE 'OTHER'
  END as meat_options_status,
  jsonb_array_length(meat_options) as meat_options_length
FROM menus
WHERE nom ILIKE '%tacos%' 
  AND (nom ILIKE '%L%' OR nom ILIKE '%2 viandes%')
ORDER BY nom;

-- Afficher le contenu complet de meat_options pour debug
SELECT 
  nom,
  meat_options,
  jsonb_pretty(meat_options) as meat_options_pretty
FROM menus
WHERE nom ILIKE '%tacos L%' OR nom ILIKE '%2 viandes%';

