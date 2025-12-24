-- Script pour corriger les taux de commission des restaurants
-- Tous à 20% SAUF all'ovale à 15% et la bonne pâte à 0%

-- 1. Vérifier les taux actuels de tous les restaurants
SELECT id, nom, commission_rate 
FROM restaurants 
ORDER BY nom;

-- 2. D'abord mettre la bonne pâte à 0% (pour éviter qu'elle soit écrasée)
UPDATE restaurants 
SET commission_rate = 0
WHERE nom ILIKE '%bonne%pate%' OR nom ILIKE '%bonne%pâte%';

-- 3. Ensuite mettre all'ovale à 15%
UPDATE restaurants 
SET commission_rate = 15
WHERE id = 'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824'
   OR (nom ILIKE '%all%ovale%' AND nom ILIKE '%pizza%');

-- 4. Enfin mettre tous les autres restaurants à 20% (sauf ceux déjà modifiés)
UPDATE restaurants 
SET commission_rate = 20
WHERE commission_rate IS NULL 
   OR (commission_rate != 0 AND commission_rate != 15);

-- 5. Vérifier les résultats
SELECT id, nom, commission_rate 
FROM restaurants 
ORDER BY commission_rate DESC, nom;

-- 6. Vérifier spécifiquement all'ovale et la bonne pâte
SELECT id, nom, commission_rate 
FROM restaurants 
WHERE id = 'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824'
   OR nom ILIKE '%bonne%pate%' 
   OR nom ILIKE '%bonne%pâte%'
   OR nom ILIKE '%all%ovale%'
ORDER BY nom;

