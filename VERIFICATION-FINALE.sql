-- VÉRIFICATION FINALE DE L'UTILISATEUR
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER SI L'UTILISATEUR EXISTE DANS LA TABLE users
SELECT 
  id,
  email,
  nom,
  prenom,
  role,
  telephone,
  adresse
FROM users 
WHERE id = '30574c6c-9843-4eab-be9f-456a383d3957';

-- 2. VÉRIFIER SI CET UTILISATEUR EST LIÉ À UN RESTAURANT
SELECT 
  r.id as restaurant_id,
  r.nom as restaurant_nom,
  r.user_id,
  u.email as user_email,
  u.role as user_role
FROM restaurants r
JOIN users u ON r.user_id = u.id
WHERE r.user_id = '30574c6c-9843-4eab-be9f-456a383d3957';

-- 3. TESTER L'AJOUT D'ADRESSE DIRECTEMENT
INSERT INTO user_addresses (
  user_id,
  name,
  address,
  city,
  postal_code,
  is_default
) VALUES (
  '30574c6c-9843-4eab-be9f-456a383d3957',
  'Adresse Test Finale',
  '999 Rue de Test Final',
  'Montpellier',
  '34000',
  false
);

-- 4. VÉRIFIER QUE L'ADRESSE A ÉTÉ CRÉÉE
SELECT 
  id,
  user_id,
  name,
  address,
  city,
  postal_code,
  created_at
FROM user_addresses 
WHERE user_id = '30574c6c-9843-4eab-be9f-456a383d3957'
ORDER BY created_at DESC
LIMIT 5;
