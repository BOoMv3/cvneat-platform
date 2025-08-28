-- Script pour vérifier la structure de la table users
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Voir toutes les tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Voir la structure de la table users (si elle existe)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 3. Voir les données de la table users (si elle existe)
SELECT * FROM users LIMIT 5;

-- 4. Voir les tables liées à l'authentification
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'auth' 
ORDER BY table_name; 