-- Script pour vérifier les restaurants existants
-- À exécuter dans Supabase SQL Editor

-- Vérifier tous les restaurants
SELECT '=== RESTAURANTS EXISTANTS ===' as info;
SELECT id, nom, status, created_at FROM restaurants ORDER BY created_at DESC;

-- Vérifier le restaurant spécifique
SELECT '=== RECHERCHE RESTAURANT ===' as info;
SELECT id, nom, status FROM restaurants WHERE id = '11111111-1111-1111-1111-111111111111';

-- Compter les restaurants
SELECT '=== NOMBRE DE RESTAURANTS ===' as info;
SELECT COUNT(*) as total_restaurants FROM restaurants;
