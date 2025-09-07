-- Vérifier la structure de la table users
-- À exécuter dans Supabase SQL Editor

-- 1. Voir toutes les colonnes de la table users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Voir quelques exemples d'utilisateurs existants
SELECT * FROM users LIMIT 3;

-- 3. Voir les noms de colonnes disponibles
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE '%name%';
