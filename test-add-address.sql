-- TEST D'AJOUT D'ADRESSE AVEC UN UTILISATEUR EXISTANT
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER UN UTILISATEUR EXISTANT
SELECT id, email, role 
FROM users 
WHERE email = 'restaurant@cvneat.com'
LIMIT 1;

-- 2. TESTER L'INSERTION D'UNE ADRESSE
-- Remplacez 'USER_ID_ICI' par l'ID de l'utilisateur ci-dessus
INSERT INTO user_addresses (
  user_id,
  name,
  address,
  city,
  postal_code,
  is_default
) VALUES (
  '30574c6c-9843-4eab-be9f-456a383d3957', -- ID du restaurant
  'Adresse Test',
  '123 Rue de Test',
  'Montpellier',
  '34000',
  false
);

-- 3. VÉRIFIER QUE L'ADRESSE A ÉTÉ CRÉÉE
SELECT * FROM user_addresses 
WHERE user_id = '30574c6c-9843-4eab-be9f-456a383d3957'
ORDER BY created_at DESC
LIMIT 5;
