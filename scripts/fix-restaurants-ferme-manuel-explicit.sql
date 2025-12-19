-- Script pour mettre explicitement ferme_manuellement = false pour TOUS les restaurants actifs
-- (sauf ceux qui sont explicitement fermés manuellement)

-- Vérifier d'abord ce qui sera modifié
SELECT 
  id,
  nom,
  ferme_manuellement as valeur_actuelle,
  pg_typeof(ferme_manuellement) as type_actuel,
  CASE 
    WHEN ferme_manuellement = true OR ferme_manuellement::text = 'true' OR ferme_manuellement::text = '1' 
    THEN 'RESTERA FERMÉ (ne sera pas modifié)'
    ELSE 'SERA MIS À false'
  END as action
FROM restaurants
WHERE status = 'active'
ORDER BY nom;

-- Si le résultat ci-dessus est correct, décommentez les lignes suivantes pour appliquer :
/*
-- Mettre ferme_manuellement = false pour tous les restaurants actifs
-- SAUF ceux qui sont explicitement fermés (true, 'true', '1')
UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE status = 'active'
  AND (
    ferme_manuellement IS NULL 
    OR ferme_manuellement = false
    OR ferme_manuellement::text = 'false'
    OR ferme_manuellement::text = '0'
    OR ferme_manuellement::text = 'null'
  );

-- Vérifier le résultat final
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as type,
  CASE 
    WHEN ferme_manuellement = true OR ferme_manuellement::text = 'true' OR ferme_manuellement::text = '1' 
    THEN 'FERMÉ MANUELLEMENT'
    ELSE 'OUVERT (vérifie horaires)'
  END as statut,
  updated_at
FROM restaurants
WHERE status = 'active'
ORDER BY nom;
*/

