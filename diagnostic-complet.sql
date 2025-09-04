-- DIAGNOSTIC COMPLET DU SYSTÈME
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier TOUS les utilisateurs
SELECT '=== TOUS LES UTILISATEURS ===' as info;
SELECT id, email, role, nom, prenom, password, created_at FROM users ORDER BY created_at DESC;

-- 2. Vérifier spécifiquement les livreurs
SELECT '=== LIVREURS ===' as info;
SELECT id, email, role, nom, prenom FROM users WHERE role = 'delivery';

-- 3. Vérifier le compte livreur1
SELECT '=== COMPTE LIVREUR1 ===' as info;
SELECT id, email, role, nom, prenom, password FROM users WHERE email = 'livreur1@cvneat.com';

-- 4. Vérifier le compte livreur
SELECT '=== COMPTE LIVREUR ===' as info;
SELECT id, email, role, nom, prenom, password FROM users WHERE email = 'livreur@cvneat.com';

-- 5. Vérifier TOUS les restaurants
SELECT '=== RESTAURANTS ===' as info;
SELECT id, nom, status, created_at FROM restaurants ORDER BY created_at DESC;

-- 6. Vérifier TOUTES les commandes
SELECT '=== TOUTES LES COMMANDES ===' as info;
SELECT id, customer_name, status, total_amount, created_at FROM orders ORDER BY created_at DESC;

-- 7. Vérifier les commandes par statut
SELECT '=== COMMANDES PAR STATUT ===' as info;
SELECT status, COUNT(*) as count FROM orders GROUP BY status;

-- 8. Vérifier les menus
SELECT '=== MENUS ===' as info;
SELECT id, nom, prix, disponible, restaurant_id FROM menus WHERE disponible = true LIMIT 10;

-- 9. Résumé final
SELECT '=== RÉSUMÉ FINAL ===' as info;
SELECT 'Utilisateurs total:' as type, COUNT(*) as count FROM users
UNION ALL
SELECT 'Livreurs:' as type, COUNT(*) as count FROM users WHERE role = 'delivery'
UNION ALL
SELECT 'Restaurants:' as type, COUNT(*) as count FROM restaurants
UNION ALL
SELECT 'Commandes total:' as type, COUNT(*) as count FROM orders
UNION ALL
SELECT 'Commandes pending:' as type, COUNT(*) as count FROM orders WHERE status = 'pending'
UNION ALL
SELECT 'Commandes ready:' as type, COUNT(*) as count FROM orders WHERE status = 'ready'
UNION ALL
SELECT 'Menus disponibles:' as type, COUNT(*) as count FROM menus WHERE disponible = true;
