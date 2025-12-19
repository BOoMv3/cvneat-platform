-- Script pour corriger tous les restaurants qui ont ferme_manuellement = NULL ou une valeur incorrecte
-- Met ferme_manuellement à false pour tous les restaurants actifs (sauf ceux explicitement fermés)

-- D'abord, on liste ce qui sera modifié
SELECT 
  id,
  nom,
  ferme_manuellement as avant,
  'false' as apres,
  'Sera modifié' as action
FROM restaurants
WHERE status = 'active'
  AND (
    ferme_manuellement IS NULL 
    OR ferme_manuellement::text = 'null'
    OR (ferme_manuellement != true AND ferme_manuellement::text != 'true' AND ferme_manuellement::text != '1')
  )
ORDER BY nom;

-- Si le résultat ci-dessus est correct, décommentez les lignes suivantes pour appliquer la correction :
/*
UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE status = 'active'
  AND (
    ferme_manuellement IS NULL 
    OR ferme_manuellement::text = 'null'
    OR (ferme_manuellement != true AND ferme_manuellement::text != 'true' AND ferme_manuellement::text != '1')
  );

-- Vérifier le résultat
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as type,
  updated_at
FROM restaurants
WHERE status = 'active'
ORDER BY nom;
*/

