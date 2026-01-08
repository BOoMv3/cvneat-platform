-- Script SQL pour trouver "pizza du moment" dans le menu de La Bonne Pâte

-- 1. Trouver le restaurant
SELECT id, nom 
FROM restaurants 
WHERE nom ILIKE '%bonne%' AND (nom ILIKE '%pât%' OR nom ILIKE '%pate%');

-- 2. Trouver tous les items contenant "moment" ou "jour" pour La Bonne Pâte
-- Remplacer d6725fe6-59ec-413a-b39b-ddb960824999 par l'ID trouvé ci-dessus
SELECT id, nom, category, prix, disponible, created_at
FROM menus
WHERE restaurant_id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
  AND (nom ILIKE '%moment%' OR nom ILIKE '%jour%' OR (nom ILIKE '%pizza%' AND (nom ILIKE '%moment%' OR nom ILIKE '%jour%')))
ORDER BY nom;

-- 3. Lister TOUS les items du restaurant (pour vérification)
SELECT id, nom, category, prix, disponible
FROM menus
WHERE restaurant_id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
ORDER BY category, nom;

-- 4. Supprimer "pizza du moment" si trouvée (remplacer l'ID)
-- DELETE FROM menus WHERE id = 'ID_TROUVÉ_CI_DESSUS';

