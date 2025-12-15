-- Corriger les options des tacos pour O Toasty
-- Vérifier d'abord l'état actuel, puis mettre à jour avec les bonnes options

-- 1. Vérifier l'état actuel
SELECT 
  m.id,
  m.nom,
  m.meat_options,
  m.sauce_options,
  m.base_ingredients,
  m.supplements,
  m.requires_meat_selection,
  m.requires_sauce_selection,
  m.max_meats,
  m.max_sauces
FROM menus m
JOIN restaurants r ON m.restaurant_id = r.id
WHERE (LOWER(r.nom) LIKE '%toasty%' OR LOWER(r.nom) LIKE '%o toasty%')
  AND (LOWER(m.nom) LIKE '%tacos%' OR LOWER(m.category) LIKE '%tacos%')
ORDER BY m.nom;

-- 2. Mettre à jour les options de viande pour les tacos
UPDATE menus m
SET 
  meat_options = '[
    {"id": "poulet", "nom": "Poulet", "prix": 0, "default": true},
    {"id": "tenders", "nom": "Tenders", "prix": 0, "default": false},
    {"id": "escalope", "nom": "Escalope panée", "prix": 0, "default": false},
    {"id": "cordon-bleu", "nom": "Cordon bleu", "prix": 0, "default": false},
    {"id": "viande-hachee", "nom": "Viande hachée", "prix": 0, "default": false},
    {"id": "kebab", "nom": "Kebab", "prix": 0, "default": false},
    {"id": "nuggets", "nom": "Nuggets", "prix": 0, "default": false}
  ]'::jsonb,
  sauce_options = '[
    {"id": "algerienne", "nom": "Algérienne", "prix": 0, "default": true},
    {"id": "andalouse", "nom": "Andalouse", "prix": 0, "default": false},
    {"id": "mayonnaise", "nom": "Mayonnaise", "prix": 0, "default": false},
    {"id": "chilli-thai", "nom": "Chilli Thai", "prix": 0, "default": false},
    {"id": "barbecue", "nom": "Barbecue", "prix": 0, "default": false},
    {"id": "blanche", "nom": "Blanche", "prix": 0, "default": false},
    {"id": "ketchup", "nom": "Ketchup", "prix": 0, "default": false},
    {"id": "biggy", "nom": "Biggy", "prix": 0, "default": false},
    {"id": "curry", "nom": "Curry", "prix": 0, "default": false},
    {"id": "harissa", "nom": "Harissa", "prix": 0, "default": false},
    {"id": "samourai", "nom": "Samouraï", "prix": 0, "default": false}
  ]'::jsonb,
  base_ingredients = '[
    {"id": "frites", "nom": "Frites", "prix": 0, "removable": false},
    {"id": "sauce-fromagere", "nom": "Sauce fromagère maison", "prix": 0, "removable": false}
  ]'::jsonb,
  requires_meat_selection = true,
  requires_sauce_selection = false,
  max_sauces = 2
FROM restaurants r
WHERE m.restaurant_id = r.id
  AND (LOWER(r.nom) LIKE '%toasty%' OR LOWER(r.nom) LIKE '%o toasty%')
  AND (LOWER(m.nom) LIKE '%tacos%' OR LOWER(m.category) LIKE '%tacos%')
  AND (m.nom LIKE '%M%' OR m.nom LIKE '%1 Viande%');

-- 3. Pour les tacos L (2 viandes)
UPDATE menus m
SET 
  meat_options = '[
    {"id": "poulet", "nom": "Poulet", "prix": 0, "default": true},
    {"id": "tenders", "nom": "Tenders", "prix": 0, "default": false},
    {"id": "escalope", "nom": "Escalope panée", "prix": 0, "default": false},
    {"id": "cordon-bleu", "nom": "Cordon bleu", "prix": 0, "default": false},
    {"id": "viande-hachee", "nom": "Viande hachée", "prix": 0, "default": false},
    {"id": "kebab", "nom": "Kebab", "prix": 0, "default": false},
    {"id": "nuggets", "nom": "Nuggets", "prix": 0, "default": false}
  ]'::jsonb,
  sauce_options = '[
    {"id": "algerienne", "nom": "Algérienne", "prix": 0, "default": true},
    {"id": "andalouse", "nom": "Andalouse", "prix": 0, "default": false},
    {"id": "mayonnaise", "nom": "Mayonnaise", "prix": 0, "default": false},
    {"id": "chilli-thai", "nom": "Chilli Thai", "prix": 0, "default": false},
    {"id": "barbecue", "nom": "Barbecue", "prix": 0, "default": false},
    {"id": "blanche", "nom": "Blanche", "prix": 0, "default": false},
    {"id": "ketchup", "nom": "Ketchup", "prix": 0, "default": false},
    {"id": "biggy", "nom": "Biggy", "prix": 0, "default": false},
    {"id": "curry", "nom": "Curry", "prix": 0, "default": false},
    {"id": "harissa", "nom": "Harissa", "prix": 0, "default": false},
    {"id": "samourai", "nom": "Samouraï", "prix": 0, "default": false}
  ]'::jsonb,
  base_ingredients = '[
    {"id": "frites", "nom": "Frites", "prix": 0, "removable": false},
    {"id": "sauce-fromagere", "nom": "Sauce fromagère maison", "prix": 0, "removable": false}
  ]'::jsonb,
  requires_meat_selection = true,
  requires_sauce_selection = false,
  max_meats = 2,
  max_sauces = 2
FROM restaurants r
WHERE m.restaurant_id = r.id
  AND (LOWER(r.nom) LIKE '%toasty%' OR LOWER(r.nom) LIKE '%o toasty%')
  AND (LOWER(m.nom) LIKE '%tacos%' OR LOWER(m.category) LIKE '%tacos%')
  AND (m.nom LIKE '%L%' OR m.nom LIKE '%2 Viandes%');

-- 4. Pour les tacos XL (3 viandes)
UPDATE menus m
SET 
  meat_options = '[
    {"id": "poulet", "nom": "Poulet", "prix": 0, "default": true},
    {"id": "tenders", "nom": "Tenders", "prix": 0, "default": false},
    {"id": "escalope", "nom": "Escalope panée", "prix": 0, "default": false},
    {"id": "cordon-bleu", "nom": "Cordon bleu", "prix": 0, "default": false},
    {"id": "viande-hachee", "nom": "Viande hachée", "prix": 0, "default": false},
    {"id": "kebab", "nom": "Kebab", "prix": 0, "default": false},
    {"id": "nuggets", "nom": "Nuggets", "prix": 0, "default": false}
  ]'::jsonb,
  sauce_options = '[
    {"id": "algerienne", "nom": "Algérienne", "prix": 0, "default": true},
    {"id": "andalouse", "nom": "Andalouse", "prix": 0, "default": false},
    {"id": "mayonnaise", "nom": "Mayonnaise", "prix": 0, "default": false},
    {"id": "chilli-thai", "nom": "Chilli Thai", "prix": 0, "default": false},
    {"id": "barbecue", "nom": "Barbecue", "prix": 0, "default": false},
    {"id": "blanche", "nom": "Blanche", "prix": 0, "default": false},
    {"id": "ketchup", "nom": "Ketchup", "prix": 0, "default": false},
    {"id": "biggy", "nom": "Biggy", "prix": 0, "default": false},
    {"id": "curry", "nom": "Curry", "prix": 0, "default": false},
    {"id": "harissa", "nom": "Harissa", "prix": 0, "default": false},
    {"id": "samourai", "nom": "Samouraï", "prix": 0, "default": false}
  ]'::jsonb,
  base_ingredients = '[
    {"id": "frites", "nom": "Frites", "prix": 0, "removable": false},
    {"id": "sauce-fromagere", "nom": "Sauce fromagère maison", "prix": 0, "removable": false}
  ]'::jsonb,
  requires_meat_selection = true,
  requires_sauce_selection = false,
  max_meats = 3,
  max_sauces = 2
FROM restaurants r
WHERE m.restaurant_id = r.id
  AND (LOWER(r.nom) LIKE '%toasty%' OR LOWER(r.nom) LIKE '%o toasty%')
  AND (LOWER(m.nom) LIKE '%tacos%' OR LOWER(m.category) LIKE '%tacos%')
  AND (m.nom LIKE '%XL%' OR m.nom LIKE '%3 Viandes%');

-- 5. Ajouter les suppléments pour tous les tacos
UPDATE menus m
SET 
  supplements = '[
    {"nom": "Gratiné", "prix": 1.20},
    {"nom": "Cheddar", "prix": 1.08},
    {"nom": "Raclette", "prix": 1.08},
    {"nom": "Kiri", "prix": 1.08},
    {"nom": "Chèvre", "prix": 1.08},
    {"nom": "Mozza", "prix": 1.08},
    {"nom": "Oignon", "prix": 0.60},
    {"nom": "Tomates", "prix": 0.60},
    {"nom": "Lardons", "prix": 0.60},
    {"nom": "Bacon", "prix": 0.60},
    {"nom": "Blanc de poulet", "prix": 0.60},
    {"nom": "Miel", "prix": 0.60},
    {"nom": "Frites Petite", "prix": 1.80},
    {"nom": "Frites Grande", "prix": 3.60}
  ]'::jsonb
FROM restaurants r
WHERE m.restaurant_id = r.id
  AND (LOWER(r.nom) LIKE '%toasty%' OR LOWER(r.nom) LIKE '%o toasty%')
  AND (LOWER(m.nom) LIKE '%tacos%' OR LOWER(m.category) LIKE '%tacos%');

-- 6. Vérifier le résultat final
SELECT 
  m.id,
  m.nom,
  jsonb_array_length(m.meat_options) as nb_viandes,
  jsonb_array_length(m.sauce_options) as nb_sauces,
  jsonb_array_length(m.supplements) as nb_supplements,
  m.requires_meat_selection,
  m.max_meats,
  m.max_sauces
FROM menus m
JOIN restaurants r ON m.restaurant_id = r.id
WHERE (LOWER(r.nom) LIKE '%toasty%' OR LOWER(r.nom) LIKE '%o toasty%')
  AND (LOWER(m.nom) LIKE '%tacos%' OR LOWER(m.category) LIKE '%tacos%')
ORDER BY m.nom;

