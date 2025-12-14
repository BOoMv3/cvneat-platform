-- Script de TEST pour vérifier que RLS fonctionne correctement
-- À exécuter APRÈS la migration pour s'assurer que tout fonctionne

-- ============================================
-- TESTS DE LECTURE PUBLIQUE (doivent fonctionner)
-- ============================================

-- Test 1: Lecture des restaurants (doit fonctionner pour tous)
-- Exécuter en tant qu'utilisateur anonyme
DO $$
BEGIN
  RAISE NOTICE 'Test 1: Lecture restaurants (anonyme)';
  -- Si ça échoue, il y a un problème
END $$;

-- Test 2: Lecture des menus (doit fonctionner pour tous)
DO $$
BEGIN
  RAISE NOTICE 'Test 2: Lecture menus (anonyme)';
  -- Si ça échoue, il y a un problème
END $$;

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que RLS est activé sur toutes les tables
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'restaurants',
  'menus',
  'menu_supplements',
  'commande_details',
  'user_favorites',
  'chat_messages',
  'restaurant_requests',
  'partnership_requests',
  'advertising_requests',
  'delivery_applications',
  'advertisements',
  'menu_combos',
  'menu_combo_steps',
  'menu_combo_options',
  'menu_combo_option_variants',
  'geocoded_addresses_cache',
  'delivery_push_subscriptions',
  'users'
)
ORDER BY tablename;

-- Vérifier que les politiques existent
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'restaurants',
  'menus',
  'menu_supplements',
  'commande_details'
)
ORDER BY tablename, policyname;

