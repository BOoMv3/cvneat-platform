-- Script pour vérifier la structure exacte de la table orders
-- À exécuter dans Supabase SQL Editor

-- Vérifier la structure de la table orders
SELECT 'Structure de la table orders:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Vérifier les données existantes dans orders
SELECT 'Données existantes dans orders:' as info;
SELECT * FROM orders LIMIT 5;

-- Vérifier s'il y a une colonne pour l'utilisateur
SELECT 'Colonnes contenant "user" ou "customer":' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND (column_name LIKE '%user%' OR column_name LIKE '%customer%' OR column_name LIKE '%client%');
