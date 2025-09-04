-- Script de diagnostic corrigé pour le livreur
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la structure de la table orders
SELECT '=== STRUCTURE TABLE ORDERS ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 2. Vérifier l'utilisateur dans la table users
SELECT '=== UTILISATEUR LIVREUR ===' as info;
SELECT id, email, role, nom, prenom, created_at FROM users WHERE email = 'livreur@cvneat.com';

-- 3. Vérifier tous les utilisateurs avec rôle delivery
SELECT '=== UTILISATEURS DELIVERY ===' as info;
SELECT id, email, role, nom, prenom FROM users WHERE role = 'delivery';

-- 4. Vérifier toutes les commandes (structure complète)
SELECT '=== TOUTES LES COMMANDES ===' as info;
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- 5. Vérifier les restaurants
SELECT '=== RESTAURANTS ===' as info;
SELECT id, nom, status FROM restaurants;

-- 6. Vérifier les menus
SELECT '=== MENUS ===' as info;
SELECT id, nom, prix, disponible, restaurant_id FROM menus WHERE disponible = true;

-- 7. Résumé final
SELECT '=== RÉSUMÉ FINAL ===' as info;
SELECT 
  'Livreurs' as type, 
  COUNT(*) as count 
FROM users WHERE role = 'delivery'
UNION ALL
SELECT 
  'Total commandes' as type, 
  COUNT(*) as count 
FROM orders
UNION ALL
SELECT 
  'Restaurants' as type, 
  COUNT(*) as count 
FROM restaurants
UNION ALL
SELECT 
  'Menus disponibles' as type, 
  COUNT(*) as count 
FROM menus WHERE disponible = true;
