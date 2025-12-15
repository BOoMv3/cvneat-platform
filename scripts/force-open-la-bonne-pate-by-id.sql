-- Forcer l'ouverture du restaurant "La Bonne Pâte" par ID
-- ID: d6725fe6-59ec-413a-b39b-ddb960824999

UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';

-- Vérifier le résultat immédiatement
SELECT 
  id,
  nom,
  ferme_manuellement,
  status,
  updated_at,
  CASE 
    WHEN horaires IS NULL THEN 'NULL'
    WHEN horaires::text = '{}' THEN 'Vide'
    ELSE 'Configuré'
  END as horaires_status
FROM restaurants
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';

