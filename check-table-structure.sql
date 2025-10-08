-- SCRIPT POUR VÉRIFIER LA STRUCTURE DE LA TABLE COMMANDES
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LES COLONNES DE LA TABLE COMMANDES
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VÉRIFIER SI LA COLONNE PREPARATION_TIME EXISTE
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
  AND column_name LIKE '%preparation%';

-- 3. VÉRIFIER SI LA COLONNE PREPARATION_TIME EXISTE
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
  AND column_name LIKE '%time%';
