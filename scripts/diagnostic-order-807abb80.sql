-- Diagnostic commande #807abb80 (La Bonne Pâte) - pourquoi prix erronés ?
-- À exécuter dans Supabase SQL Editor

-- 1) Commande
SELECT id, created_at, total, frais_livraison, restaurant_id, payment_status, total_paid
FROM commandes WHERE id = '807abb80-3edc-4e1d-a619-0f90167164aa';

-- 2) Détails + prix stockés
SELECT
  dc.id,
  dc.plat_id,
  dc.quantite,
  dc.prix_unitaire,
  dc.supplements,
  dc.customizations,
  m.nom as menu_nom,
  m.prix as menu_prix_actuel
FROM details_commande dc
LEFT JOIN menus m ON m.id = dc.plat_id
WHERE dc.commande_id = '807abb80-3edc-4e1d-a619-0f90167164aa';

-- 3) Suppléments viande (jambon) dans les menus du restaurant de cette commande
SELECT m.nom, m.prix as prix_base, m.supplements
FROM menus m
JOIN commandes c ON c.restaurant_id = m.restaurant_id
WHERE c.id = '807abb80-3edc-4e1d-a619-0f90167164aa'
  AND m.supplements IS NOT NULL
  AND jsonb_array_length(COALESCE(m.supplements::jsonb, '[]'::jsonb)) > 0;
