-- Vérifier si la table menu_supplements existe et contient des données

-- 1. Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'menu_supplements'
) AS table_exists;

-- 2. Compter le nombre de suppléments dans menu_supplements
SELECT COUNT(*) as total_supplements
FROM menu_supplements
WHERE disponible = true;

-- 3. Afficher quelques exemples de suppléments
SELECT 
  ms.id,
  ms.menu_item_id,
  m.nom as menu_nom,
  ms.nom as supplement_nom,
  ms.prix,
  ms.disponible,
  ms.ordre
FROM menu_supplements ms
LEFT JOIN menus m ON ms.menu_item_id = m.id
WHERE ms.disponible = true
ORDER BY ms.ordre
LIMIT 20;

-- 4. Vérifier les suppléments pour un restaurant spécifique (remplacer l'ID)
SELECT 
  r.nom as restaurant_nom,
  m.nom as menu_nom,
  ms.nom as supplement_nom,
  ms.prix,
  ms.disponible
FROM menu_supplements ms
JOIN menus m ON ms.menu_item_id = m.id
JOIN restaurants r ON m.restaurant_id = r.id
WHERE ms.disponible = true
ORDER BY r.nom, m.nom, ms.ordre
LIMIT 50;

-- 5. Vérifier si la colonne supplements dans menus contient des données
SELECT 
  COUNT(*) as menus_with_supplements_column,
  COUNT(CASE WHEN supplements IS NOT NULL AND supplements::text != '[]'::text AND supplements::text != 'null' THEN 1 END) as menus_with_supplements_data
FROM menus;

