-- Correction de la catégorie de la coppa
UPDATE menus 
SET category = 'base tomate' 
WHERE nom ILIKE '%coppa%' AND category = 'base crème'; 