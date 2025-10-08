-- SCRIPT COMPLET POUR DIAGNOSTIQUER LA CONTRAINTE STATUT
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER TOUTES LES CONTRAINTES SUR LA TABLE COMMANDES
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  consrc as constraint_definition,
  pg_get_constraintdef(oid) as full_definition
FROM pg_constraint 
WHERE conrelid = 'commandes'::regclass 
ORDER BY conname;

-- 2. VÉRIFIER LA DÉFINITION EXACTE DE LA CONTRAINTE STATUT
SELECT 
  conname,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'commandes'::regclass 
  AND conname LIKE '%statut%';

-- 3. VÉRIFIER LES VALEURS AUTORISÉES SI C'EST UN ENUM
SELECT 
  t.typname as enum_name,
  e.enumlabel as allowed_value,
  e.enumsortorder as sort_order
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%statut%' OR t.typname LIKE '%status%'
ORDER BY e.enumsortorder;

-- 4. VÉRIFIER LES STATUTS ACTUELS DANS LA TABLE
SELECT DISTINCT 
  statut, 
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM commandes 
GROUP BY statut
ORDER BY statut;

-- 5. VÉRIFIER LA STRUCTURE COMPLÈTE DE LA TABLE
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
