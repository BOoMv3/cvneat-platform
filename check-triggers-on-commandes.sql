-- Script SQL pour vérifier s'il y a des triggers qui modifient automatiquement les statuts
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier tous les triggers sur la table commandes
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'commandes'
ORDER BY trigger_name;

-- 2. Vérifier s'il y a des fonctions trigger qui modifient le statut
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%statut%'
AND pg_get_functiondef(p.oid) ILIKE '%commandes%';

-- 3. Vérifier les contraintes CHECK sur la table commandes
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.commandes'::regclass
AND contype = 'c';

-- 4. Vérifier les règles (rules) sur la table commandes
SELECT 
    rulename,
    definition
FROM pg_rules
WHERE tablename = 'commandes';

