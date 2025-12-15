-- Vérifier les options des tacos pour O Toasty
-- Vérifier si les colonnes meat_options, sauce_options, supplements existent et sont remplies

SELECT 
  m.id,
  m.nom,
  m.category,
  m.meat_options,
  m.sauce_options,
  m.base_ingredients,
  m.supplements,
  m.requires_meat_selection,
  m.requires_sauce_selection,
  m.max_meats,
  m.max_sauces,
  CASE 
    WHEN m.meat_options IS NULL THEN 'NULL'
    WHEN m.meat_options::text = '[]' THEN 'Vide []'
    WHEN m.meat_options::text = 'null' THEN 'null'
    ELSE 'Présent'
  END as meat_options_status,
  CASE 
    WHEN m.sauce_options IS NULL THEN 'NULL'
    WHEN m.sauce_options::text = '[]' THEN 'Vide []'
    WHEN m.sauce_options::text = 'null' THEN 'null'
    ELSE 'Présent'
  END as sauce_options_status,
  CASE 
    WHEN m.supplements IS NULL THEN 'NULL'
    WHEN m.supplements::text = '[]' THEN 'Vide []'
    WHEN m.supplements::text = 'null' THEN 'null'
    ELSE 'Présent'
  END as supplements_status
FROM menus m
JOIN restaurants r ON m.restaurant_id = r.id
WHERE (LOWER(r.nom) LIKE '%toasty%' OR LOWER(r.nom) LIKE '%o toasty%')
  AND (LOWER(m.nom) LIKE '%tacos%' OR LOWER(m.category) LIKE '%tacos%')
ORDER BY m.nom;
