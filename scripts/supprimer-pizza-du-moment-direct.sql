-- Script SQL pour supprimer "pizza du moment" de La Bonne Pâte
-- À exécuter dans Supabase SQL Editor

-- 1. Trouver toutes les pizzas du moment ou du jour
SELECT id, nom, category, prix, disponible
FROM menus
WHERE restaurant_id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
  AND (
    nom ILIKE '%moment%' OR 
    nom ILIKE '%jour%' OR
    (nom ILIKE '%pizza%' AND (nom ILIKE '%moment%' OR nom ILIKE '%jour%'))
  );

-- 2. Si vous trouvez la pizza, supprimer-la en utilisant son ID
-- Remplacer 'ID_DE_LA_PIZZA' par l'ID trouvé ci-dessus
-- DELETE FROM menus WHERE id = 'ID_DE_LA_PIZZA';

-- 3. Pour lister tous les items avec leurs catégories
SELECT nom, category, prix, disponible
FROM menus
WHERE restaurant_id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
ORDER BY category, nom;

