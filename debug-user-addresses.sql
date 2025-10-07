-- SCRIPT POUR DÉBOGUER LA TABLE user_addresses
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LA STRUCTURE DE LA TABLE user_addresses
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_addresses'
ORDER BY ordinal_position;

-- 2. VÉRIFIER LES CONTRAINTES DE CLÉ ÉTRANGÈRE
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_addresses';

-- 3. VÉRIFIER LES UTILISATEURS EXISTANTS
SELECT id, email, role, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 4. VÉRIFIER LES ADRESSES EXISTANTES
SELECT 
  ua.id,
  ua.user_id,
  ua.address,
  ua.created_at,
  u.email as user_email
FROM user_addresses ua
LEFT JOIN users u ON ua.user_id = u.id
ORDER BY ua.created_at DESC
LIMIT 10;

-- 5. TROUVER LES ADRESSES AVEC DES user_id INVALIDES
SELECT 
  ua.id,
  ua.user_id,
  ua.address,
  'USER_ID_INVALIDE' as probleme
FROM user_addresses ua
LEFT JOIN users u ON ua.user_id = u.id
WHERE u.id IS NULL;
