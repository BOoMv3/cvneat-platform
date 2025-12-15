-- Vérifier l'état actuel des tacos O Toasty après la mise à jour
SELECT 
  m.id,
  m.nom,
  m.category,
  m.meat_options::text as meat_options_text,
  m.sauce_options::text as sauce_options_text,
  m.base_ingredients::text as base_ingredients_text,
  m.supplements::text as supplements_text,
  m.requires_meat_selection,
  m.requires_sauce_selection,
  m.max_meats,
  m.max_sauces,
  jsonb_array_length(COALESCE(m.meat_options, '[]'::jsonb)) as nb_viandes,
  jsonb_array_length(COALESCE(m.sauce_options, '[]'::jsonb)) as nb_sauces,
  jsonb_array_length(COALESCE(m.supplements, '[]'::jsonb)) as nb_supplements
FROM menus m
JOIN restaurants r ON m.restaurant_id = r.id
WHERE (LOWER(r.nom) LIKE '%toasty%' OR LOWER(r.nom) LIKE '%o toasty%')
  AND (LOWER(m.nom) LIKE '%tacos%' OR LOWER(m.category) LIKE '%tacos%')
ORDER BY m.nom;

