-- Script SQL (fallback) - Préférer: node scripts/fix-la-bonne-pate-prices.js
-- qui utilise exactement les prix du front (add-la-bonne-pate-menu.js)

-- 1) Voir les prix actuels
SELECT m.nom, m.prix, m.category
FROM menus m
JOIN restaurants r ON r.id = m.restaurant_id
WHERE r.nom ILIKE '%bonne pâte%' OR r.nom ILIKE '%bonne pate%'
ORDER BY m.category, m.nom;

-- 2) Mettre à jour les pizzas (prix corrects du script)
UPDATE menus m
SET prix = v.prix_correct
FROM (
  VALUES
    ('Margherita'::text, 11::numeric),
    ('Reine', 13::numeric),
    ('Paysanne', 13::numeric),
    ('Chorizo', 13::numeric),
    ('Bolo', 14::numeric),
    ('Calzone', 14.5::numeric),
    ('Végétarienne', 16::numeric),
    ('Coppa', 18::numeric),
    ('Flambée', 12::numeric),
    ('Chevrette', 14::numeric),
    ('Fromagère', 13::numeric),
    ('Tartiflette', 14::numeric),
    ('Tartufata', 18::numeric),
    ('Mortadella', 18::numeric),
    ('La Puccia italienne', 10::numeric),
    ('La Puccia végétarienne', 10::numeric),
    ('La Puccia Tartufata', 12::numeric),
    ('La Puccia Mortadella', 10::numeric),
    ('La Puccia Coppa', 10::numeric),
    ('La Puccia Classique', 10::numeric),
    ('La Puccia Cévenole', 10::numeric),
    ('Dessert du moment', 4::numeric),
    ('Pizzetta Nocciolata', 7::numeric)
) AS v(nom, prix_correct)
WHERE m.restaurant_id IN (SELECT id FROM restaurants WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%bonne pate%')
  AND TRIM(m.nom) = TRIM(v.nom);

-- 2b) Suppléments viande (jambon, etc.) = 2€
UPDATE menus m
SET supplements = (
  SELECT jsonb_agg(
    CASE
      WHEN (s->>'nom') IN ('Jambon blanc', 'Jambon cru', 'Jambon blanc truffé', 'Chorizo', 'Viande hachée de boeuf', 'Steak de boeuf 150g', 'Lard fumé', 'Coppa', 'Mortadella')
      THEN jsonb_set(jsonb_set(COALESCE(s, '{}'::jsonb), '{prix}', '2'::jsonb), '{prix_supplementaire}', '2'::jsonb)
      ELSE s
    END
  )
  FROM jsonb_array_elements(COALESCE(m.supplements, '[]'::jsonb)) s
)
WHERE m.restaurant_id IN (SELECT id FROM restaurants WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%bonne pate%')
  AND m.supplements IS NOT NULL
  AND jsonb_array_length(COALESCE(m.supplements, '[]'::jsonb)) > 0;

-- Même correction dans menu_supplements si utilisé
UPDATE menu_supplements ms
SET prix = 2
FROM menus m
JOIN restaurants r ON r.id = m.restaurant_id
WHERE ms.menu_item_id = m.id
  AND (r.nom ILIKE '%bonne pâte%' OR r.nom ILIKE '%bonne pate%')
  AND (ms.nom ILIKE '%jambon%' OR ms.nom ILIKE '%chorizo%' OR ms.nom ILIKE '%viande%' OR ms.nom ILIKE '%steak%' OR ms.nom ILIKE '%lard%' OR ms.nom ILIKE '%coppa%' OR ms.nom ILIKE '%mortadella%');

-- 3) Vérifier après mise à jour
SELECT m.nom, m.prix, m.category
FROM menus m
JOIN restaurants r ON r.id = m.restaurant_id
WHERE (r.nom ILIKE '%bonne pâte%' OR r.nom ILIKE '%bonne pate%')
  AND m.category ILIKE '%pizza%'
ORDER BY m.nom;
