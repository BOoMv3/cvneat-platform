-- SCRIPT POUR DIAGNOSTIQUER LA CONTRAINTE CHECK
-- À exécuter dans Supabase SQL Editor

-- 1. VÉRIFIER LA CONTRAINTE CHECK EXACTE
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'commandes'::regclass 
  AND conname LIKE '%statut%';

-- 2. TESTER LES VALEURS POSSIBLES
SELECT unnest(ARRAY[
  'en_attente',
  'acceptee', 
  'refusee',
  'en_preparation',
  'pret_a_livrer',
  'en_livraison',
  'livree',
  'annulee'
]) as test_statut;

-- 3. VÉRIFIER LES COMMANDES ACTUELLES
SELECT 
  id,
  statut,
  created_at
FROM commandes 
ORDER BY created_at DESC 
LIMIT 5;
