-- Script simple pour ouvrir "La Bonne Pâte"
-- À exécuter dans Supabase SQL Editor

UPDATE restaurants 
SET 
  ferme_manuellement = false
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';

-- Vérifier le résultat
SELECT id, nom, ferme_manuellement
FROM restaurants 
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';

