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
-- Utiliser une approche plus simple sans pg_get_functiondef dans le WHERE
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 3. Vérifier les contraintes CHECK sur la table commandes
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.commandes'::regclass
AND contype = 'c';

-- 4. Vérifier les règles (rules) sur la table commandes
SELECT 
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules
WHERE tablename = 'commandes';

-- 5. Vérifier les triggers avec leurs fonctions associées
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_timing,
    t.action_statement,
    p.proname as function_name
FROM information_schema.triggers t
LEFT JOIN pg_trigger pt ON pt.tgname = t.trigger_name
LEFT JOIN pg_proc p ON p.oid = pt.tgfoid
WHERE t.event_object_table = 'commandes'
ORDER BY t.trigger_name;

