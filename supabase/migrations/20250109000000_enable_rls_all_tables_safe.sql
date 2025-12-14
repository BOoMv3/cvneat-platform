-- Migration SÉCURISÉE pour activer RLS
-- Garantit que les clients peuvent toujours commander et voir les menus

-- ============================================
-- 1. Tables avec politiques mais RLS désactivé
-- ============================================

-- restaurant_requests
ALTER TABLE public.restaurant_requests ENABLE ROW LEVEL SECURITY;

-- users (garder les politiques existantes)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Tables publiques - LECTURE PUBLIQUE GARANTIE
-- ============================================

-- restaurants : CRITIQUE - Doit être lisible par tous
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Politique : Lecture publique (TOUS peuvent voir les restaurants)
DROP POLICY IF EXISTS "restaurants_public_read" ON public.restaurants;
CREATE POLICY "restaurants_public_read" ON public.restaurants
  FOR SELECT
  USING (true);

-- menus : CRITIQUE - Doit être lisible par tous
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- Politique : Lecture publique (TOUS peuvent voir les menus)
DROP POLICY IF EXISTS "menus_public_read" ON public.menus;
CREATE POLICY "menus_public_read" ON public.menus
  FOR SELECT
  USING (true);

-- menu_supplements : CRITIQUE - Doit être lisible par tous
ALTER TABLE public.menu_supplements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_supplements_public_read" ON public.menu_supplements;
CREATE POLICY "menu_supplements_public_read" ON public.menu_supplements
  FOR SELECT
  USING (true);

-- menu_combos et variants : Lecture publique
ALTER TABLE public.menu_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_combo_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_combo_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_combo_option_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_combos_public_read" ON public.menu_combos;
CREATE POLICY "menu_combos_public_read" ON public.menu_combos
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "menu_combo_steps_public_read" ON public.menu_combo_steps;
CREATE POLICY "menu_combo_steps_public_read" ON public.menu_combo_steps
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "menu_combo_options_public_read" ON public.menu_combo_options;
CREATE POLICY "menu_combo_options_public_read" ON public.menu_combo_options
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "menu_combo_option_variants_public_read" ON public.menu_combo_option_variants;
CREATE POLICY "menu_combo_option_variants_public_read" ON public.menu_combo_option_variants
  FOR SELECT
  USING (true);

-- advertisements : Lecture publique
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advertisements_public_read" ON public.advertisements;
CREATE POLICY "advertisements_public_read" ON public.advertisements
  FOR SELECT
  USING (true);

-- ============================================
-- 3. Tables de commandes - ACCÈS UTILISATEUR
-- ============================================

-- commande_details : Utilisateur peut voir les détails de SES commandes
ALTER TABLE public.commande_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commande_details_user_read" ON public.commande_details;
CREATE POLICY "commande_details_user_read" ON public.commande_details
  FOR SELECT
  USING (
    -- Permettre si l'utilisateur est propriétaire de la commande
    EXISTS (
      SELECT 1 FROM public.commandes
      WHERE commandes.id = commande_details.commande_id
      AND commandes.user_id = auth.uid()
    )
    -- OU si c'est un admin (via service role dans API)
    OR auth.role() = 'service_role'
  );

-- Permettre l'insertion pour les utilisateurs authentifiés (création de commande)
DROP POLICY IF EXISTS "commande_details_user_insert" ON public.commande_details;
CREATE POLICY "commande_details_user_insert" ON public.commande_details
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    OR auth.role() = 'service_role'
  );

-- ============================================
-- 4. Tables utilisateur - ACCÈS PROPRE
-- ============================================

-- user_favorites : Utilisateur voit/modifie ses favoris
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_favorites_own" ON public.user_favorites;
CREATE POLICY "user_favorites_own" ON public.user_favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- delivery_push_subscriptions : Utilisateur gère ses abonnements
ALTER TABLE public.delivery_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_push_subscriptions_own" ON public.delivery_push_subscriptions;
CREATE POLICY "delivery_push_subscriptions_own" ON public.delivery_push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. Tables de communication
-- ============================================

-- chat_messages : Utilisateur voit ses messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_user_read" ON public.chat_messages;
CREATE POLICY "chat_messages_user_read" ON public.chat_messages
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "chat_messages_user_write" ON public.chat_messages;
CREATE POLICY "chat_messages_user_write" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

-- ============================================
-- 6. Tables de cache/utilitaires
-- ============================================

-- geocoded_addresses_cache : Lecture/écriture publique (cache)
ALTER TABLE public.geocoded_addresses_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geocoded_addresses_cache_public" ON public.geocoded_addresses_cache;
CREATE POLICY "geocoded_addresses_cache_public" ON public.geocoded_addresses_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 7. Tables de demandes - ACCÈS PROPRE
-- ============================================

-- restaurant_requests
DROP POLICY IF EXISTS "restaurant_requests_own" ON public.restaurant_requests;
CREATE POLICY "restaurant_requests_own" ON public.restaurant_requests
  FOR ALL
  USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

-- partnership_requests
ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partnership_requests_own" ON public.partnership_requests;
CREATE POLICY "partnership_requests_own" ON public.partnership_requests
  FOR ALL
  USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

-- advertising_requests
ALTER TABLE public.advertising_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advertising_requests_own" ON public.advertising_requests;
CREATE POLICY "advertising_requests_own" ON public.advertising_requests
  FOR ALL
  USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

-- delivery_applications
ALTER TABLE public.delivery_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_applications_own" ON public.delivery_applications;
CREATE POLICY "delivery_applications_own" ON public.delivery_applications
  FOR ALL
  USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

-- ============================================
-- IMPORTANT : Les API routes utilisent service_role
-- donc elles contournent RLS automatiquement
-- ============================================

