-- Script pour vérifier le statut de TOUS les restaurants
-- Identifie ceux qui sont peut-être fermés alors qu'ils devraient être ouverts

SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as ferme_manuellement_type,
  CASE 
    WHEN ferme_manuellement IS NULL THEN 'NULL'
    WHEN ferme_manuellement = true THEN 'true (bool) - FERMÉ'
    WHEN ferme_manuellement = false THEN 'false (bool) - OUVERT (vérifie horaires)'
    WHEN ferme_manuellement::text = 'true' THEN 'true (text) - FERMÉ'
    WHEN ferme_manuellement::text = 'false' THEN 'false (text) - OUVERT (vérifie horaires)'
    WHEN ferme_manuellement::text = '1' THEN '1 (text/number) - FERMÉ'
    WHEN ferme_manuellement::text = '0' THEN '0 (text/number) - OUVERT (vérifie horaires)'
    ELSE 'autre: ' || ferme_manuellement::text
  END as ferme_manuellement_value,
  status,
  CASE 
    WHEN horaires IS NULL THEN 'AUCUN HORAIRE'
    WHEN horaires::text = '{}' THEN 'HORAIRE VIDE'
    ELSE 'HORAIRE PRÉSENT'
  END as horaires_status,
  created_at,
  updated_at
FROM restaurants
WHERE status = 'active'
ORDER BY 
  CASE 
    WHEN ferme_manuellement = true OR ferme_manuellement::text = 'true' OR ferme_manuellement::text = '1' THEN 1
    WHEN ferme_manuellement IS NULL THEN 2
    ELSE 3
  END,
  nom;

