-- TEST DIRECT DE LA REQUÊTE EXACTE DE L'API
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER L'UTILISATEUR ET SON RESTAURANT
SELECT 
  u.id as user_id,
  u.email,
  u.role,
  r.id as restaurant_id,
  r.nom as restaurant_nom
FROM users u
LEFT JOIN restaurants r ON r.user_id = u.id
WHERE u.id = '30574c6c-9843-4eab-be9f-456a383d3957';

-- 2. TESTER LA REQUÊTE EXACTE DE L'API
SELECT *
FROM commandes
WHERE restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
ORDER BY created_at DESC;

-- 3. COMPTER LES COMMANDES
SELECT COUNT(*) as total_commandes
FROM commandes
WHERE restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70';

-- 4. VÉRIFIER TOUS LES RESTAURANT_ID DANS LES COMMANDES
SELECT DISTINCT restaurant_id, COUNT(*) as nombre_commandes
FROM commandes
GROUP BY restaurant_id;

-- 5. VÉRIFIER LES PERMISSIONS RLS (si activées)
-- Cette requête nous dira si RLS est activé
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'commandes';
