-- Script de diagnostic pour le livreur
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'utilisateur dans la table users
SELECT '=== DIAGNOSTIC LIVREUR ===' as info;

SELECT '1. Utilisateur dans la table users:' as info;
SELECT id, email, role, nom, prenom, created_at FROM users WHERE email = 'livreur@cvneat.com';

-- 2. Vérifier tous les utilisateurs avec rôle delivery
SELECT '2. Tous les utilisateurs avec rôle delivery:' as info;
SELECT id, email, role, nom, prenom FROM users WHERE role = 'delivery';

-- 3. Vérifier les commandes disponibles
SELECT '3. Commandes disponibles (status=ready, delivery_id=NULL):' as info;
SELECT id, status, delivery_id, customer_name, total_amount, created_at 
FROM orders 
WHERE status = 'ready' AND delivery_id IS NULL;

-- 4. Vérifier toutes les commandes
SELECT '4. Toutes les commandes:' as info;
SELECT id, status, delivery_id, customer_name, total_amount, created_at 
FROM orders 
ORDER BY created_at DESC;

-- 5. Vérifier les restaurants
SELECT '5. Restaurants disponibles:' as info;
SELECT id, nom, status FROM restaurants WHERE status = 'active';

-- 6. Vérifier les menus
SELECT '6. Menus disponibles:' as info;
SELECT id, nom, prix, disponible, restaurant_id FROM menus WHERE disponible = true;

-- 7. Résumé final
SELECT '7. RÉSUMÉ FINAL:' as info;
SELECT 
  'Livreurs' as type, 
  COUNT(*) as count 
FROM users WHERE role = 'delivery'
UNION ALL
SELECT 
  'Commandes prêtes' as type, 
  COUNT(*) as count 
FROM orders WHERE status = 'ready' AND delivery_id IS NULL
UNION ALL
SELECT 
  'Restaurants actifs' as type, 
  COUNT(*) as count 
FROM restaurants WHERE status = 'active'
UNION ALL
SELECT 
  'Menus disponibles' as type, 
  COUNT(*) as count 
FROM menus WHERE disponible = true;
