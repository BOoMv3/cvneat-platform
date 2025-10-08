-- SCRIPT POUR VÉRIFIER LA CONTRAINTE STATUT
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LA CONTRAINTE CHECK SUR STATUT
SELECT 
  conname as constraint_name,
  consrc as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'commandes'::regclass 
  AND contype = 'c'
  AND conname LIKE '%statut%';

-- 2. VÉRIFIER LES VALEURS AUTORISÉES (si c'est un ENUM)
SELECT 
  t.typname as enum_name,
  e.enumlabel as allowed_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%statut%'
ORDER BY e.enumsortorder;

-- 3. VÉRIFIER LES STATUTS EXISTANTS DANS LA TABLE
SELECT DISTINCT statut, COUNT(*) as count
FROM commandes 
GROUP BY statut
ORDER BY statut;

-- 4. VÉRIFIER LA STRUCTURE DE LA COLONNE STATUT
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
  AND column_name = 'statut';
