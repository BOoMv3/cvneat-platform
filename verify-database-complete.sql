-- ========================================
-- SCRIPT DE VÉRIFICATION COMPLÈTE - URGENCE LANCEMENT
-- ========================================
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier que toutes les tables existent
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Vérifier la structure de la table commandes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Vérifier la structure de la table users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Vérifier la structure de la table restaurants
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'restaurants' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Vérifier la structure de la table details_commande
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'details_commande' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Compter les commandes existantes
SELECT COUNT(*) as total_commandes FROM commandes;

-- 7. Vérifier les commandes récentes
SELECT 
  id,
  user_id,
  restaurant_id,
  statut,
  total,
  frais_livraison,
  created_at
FROM commandes 
ORDER BY created_at DESC 
LIMIT 5;

-- 8. Vérifier les utilisateurs
SELECT 
  id,
  email,
  role,
  nom
FROM users 
LIMIT 5;

-- 9. Vérifier les restaurants
SELECT 
  id,
  user_id,
  nom,
  adresse
FROM restaurants 
LIMIT 5;
