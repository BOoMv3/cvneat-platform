-- Script SQL pour vérifier la définition de la fonction trigger
-- À exécuter dans Supabase SQL Editor

-- Vérifier la définition complète de la fonction update_updated_at_column()
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'update_updated_at_column';

-- Alternative: Vérifier toutes les fonctions qui mentionnent "updated_at"
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND pg_get_functiondef(p.oid) ILIKE '%updated_at%';

