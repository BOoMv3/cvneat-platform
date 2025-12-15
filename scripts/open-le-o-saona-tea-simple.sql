-- Forcer l'ouverture du restaurant "Le O Saona Tea"
UPDATE restaurants
SET ferme_manuellement = false
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%';

-- Vérification
SELECT id, nom, ferme_manuellement 
FROM restaurants 
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%';

