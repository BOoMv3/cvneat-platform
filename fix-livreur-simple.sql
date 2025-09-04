-- Script simple pour corriger le rôle du livreur
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'utilisateur existant
SELECT 'Utilisateur livreur actuel:' as info;
SELECT id, email, role, nom, prenom FROM users WHERE email = 'livreur@cvneat.com';

-- 2. Mettre à jour SEULEMENT le rôle
UPDATE users 
SET role = 'delivery',
    updated_at = NOW()
WHERE email = 'livreur@cvneat.com';

-- 3. Vérifier que la mise à jour a fonctionné
SELECT 'Utilisateur livreur après mise à jour:' as info;
SELECT id, email, role, nom, prenom FROM users WHERE email = 'livreur@cvneat.com';

-- 4. Vérifier tous les utilisateurs avec rôle delivery
SELECT 'Tous les livreurs:' as info;
SELECT id, email, role, nom, prenom FROM users WHERE role = 'delivery';

-- 5. Vérifier les commandes (sans spécifier de colonnes)
SELECT 'Commandes existantes:' as info;
SELECT * FROM orders LIMIT 5;

-- 6. Résumé final
SELECT 'Résumé final:' as info;
SELECT 'Livreurs:' as type, COUNT(*) as count FROM users WHERE role = 'delivery'
UNION ALL
SELECT 'Total commandes:' as type, COUNT(*) as count FROM orders;
