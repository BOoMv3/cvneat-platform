-- Migration pour activer RLS sur toutes les tables publiques
-- Corrige les 20 erreurs RLS détectées par Supabase

-- ============================================
-- 1. Tables avec politiques mais RLS désactivé
-- ============================================

-- restaurant_requests
ALTER TABLE public.restaurant_requests ENABLE ROW LEVEL SECURITY;

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Tables publiques sans RLS (sécurité)
-- ============================================

-- menus
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- commande_details
ALTER TABLE public.commande_details ENABLE ROW LEVEL SECURITY;

-- restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- menu_supplements
ALTER TABLE public.menu_supplements ENABLE ROW LEVEL SECURITY;

-- geocoded_addresses_cache
ALTER TABLE public.geocoded_addresses_cache ENABLE ROW LEVEL SECURITY;

-- user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- partnership_requests
ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

-- chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- delivery_push_subscriptions
ALTER TABLE public.delivery_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- menu_combos
ALTER TABLE public.menu_combos ENABLE ROW LEVEL SECURITY;

-- menu_combo_steps
ALTER TABLE public.menu_combo_steps ENABLE ROW LEVEL SECURITY;

-- menu_combo_options
ALTER TABLE public.menu_combo_options ENABLE ROW LEVEL SECURITY;

-- advertising_requests
ALTER TABLE public.advertising_requests ENABLE ROW LEVEL SECURITY;

-- advertisements
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- delivery_applications
ALTER TABLE public.delivery_applications ENABLE ROW LEVEL SECURITY;

-- menu_combo_option_variants
ALTER TABLE public.menu_combo_option_variants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Créer les politiques RLS manquantes
-- ============================================

-- restaurants : Lecture publique, écriture admin uniquement
DROP POLICY IF EXISTS "restaurants_public_read" ON public.restaurants;
CREATE POLICY "restaurants_public_read" ON public.restaurants
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "restaurants_admin_write" ON public.restaurants;
CREATE POLICY "restaurants_admin_write" ON public.restaurants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

-- menus : Lecture publique, écriture restaurant owner
DROP POLICY IF EXISTS "menus_public_read" ON public.menus;
CREATE POLICY "menus_public_read" ON public.menus
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "menus_restaurant_write" ON public.menus;
CREATE POLICY "menus_restaurant_write" ON public.menus
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE restaurants.id = menus.restaurant_id
      AND restaurants.user_id = auth.uid()
    )
  );

-- menu_supplements : Lecture publique, écriture restaurant owner
DROP POLICY IF EXISTS "menu_supplements_public_read" ON public.menu_supplements;
CREATE POLICY "menu_supplements_public_read" ON public.menu_supplements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "menu_supplements_restaurant_write" ON public.menu_supplements;
CREATE POLICY "menu_supplements_restaurant_write" ON public.menu_supplements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.menus
      JOIN public.restaurants ON restaurants.id = menus.restaurant_id
      WHERE menus.id = menu_supplements.menu_id
      AND restaurants.user_id = auth.uid()
    )
  );

-- commande_details : Lecture utilisateur/admin, écriture système
DROP POLICY IF EXISTS "commande_details_user_read" ON public.commande_details;
CREATE POLICY "commande_details_user_read" ON public.commande_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.commandes
      WHERE commandes.id = commande_details.commande_id
      AND (
        commandes.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.email IN (
            SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
          )
        )
      )
    )
  );

-- user_favorites : Utilisateur peut voir/modifier ses propres favoris
DROP POLICY IF EXISTS "user_favorites_own" ON public.user_favorites;
CREATE POLICY "user_favorites_own" ON public.user_favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- chat_messages : Utilisateur peut voir ses messages
DROP POLICY IF EXISTS "chat_messages_user_read" ON public.chat_messages;
CREATE POLICY "chat_messages_user_read" ON public.chat_messages
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'delivery')
      )
    )
  );

DROP POLICY IF EXISTS "chat_messages_user_write" ON public.chat_messages;
CREATE POLICY "chat_messages_user_write" ON public.chat_messages
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- geocoded_addresses_cache : Lecture publique, écriture système
DROP POLICY IF EXISTS "geocoded_addresses_cache_public" ON public.geocoded_addresses_cache;
CREATE POLICY "geocoded_addresses_cache_public" ON public.geocoded_addresses_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- delivery_push_subscriptions : Utilisateur peut gérer ses propres abonnements
DROP POLICY IF EXISTS "delivery_push_subscriptions_own" ON public.delivery_push_subscriptions;
CREATE POLICY "delivery_push_subscriptions_own" ON public.delivery_push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- menu_combos, menu_combo_steps, menu_combo_options, menu_combo_option_variants
-- Lecture publique, écriture restaurant owner
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

-- restaurant_requests, partnership_requests, advertising_requests, delivery_applications
-- Utilisateur peut créer et voir ses propres demandes
DROP POLICY IF EXISTS "restaurant_requests_own" ON public.restaurant_requests;
CREATE POLICY "restaurant_requests_own" ON public.restaurant_requests
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "partnership_requests_own" ON public.partnership_requests;
CREATE POLICY "partnership_requests_own" ON public.partnership_requests
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "advertising_requests_own" ON public.advertising_requests;
CREATE POLICY "advertising_requests_own" ON public.advertising_requests
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delivery_applications_own" ON public.delivery_applications;
CREATE POLICY "delivery_applications_own" ON public.delivery_applications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- advertisements : Lecture publique, écriture admin
DROP POLICY IF EXISTS "advertisements_public_read" ON public.advertisements;
CREATE POLICY "advertisements_public_read" ON public.advertisements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "advertisements_admin_write" ON public.advertisements;
CREATE POLICY "advertisements_admin_write" ON public.advertisements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN (
        SELECT email FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
      )
    )
  );

