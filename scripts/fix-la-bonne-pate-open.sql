-- Corriger le statut de "La Bonne Pâte" pour qu'elle soit ouverte
-- ID connu de "La Bonne Pâte" : d6725fe6-59ec-413a-b39b-ddb960824999

-- Vérifier d'abord le statut actuel
SELECT 
  id,
  nom,
  ferme_manuellement,
  is_closed,
  horaires
FROM restaurants
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
   OR LOWER(nom) LIKE '%bonne pâte%' 
   OR LOWER(nom) LIKE '%bonne pate%';

-- Mettre à jour pour ouvrir le restaurant
UPDATE restaurants 
SET 
  ferme_manuellement = false
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
   OR (LOWER(nom) LIKE '%bonne pâte%' OR LOWER(nom) LIKE '%bonne pate%');

-- Vérifier après la mise à jour
SELECT 
  id,
  nom,
  ferme_manuellement
FROM restaurants
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999'
   OR LOWER(nom) LIKE '%bonne pâte%' 
   OR LOWER(nom) LIKE '%bonne pate%';

