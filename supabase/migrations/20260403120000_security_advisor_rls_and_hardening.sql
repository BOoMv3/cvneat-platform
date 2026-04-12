-- Security Advisor: activer RLS, politiques, vue leaderboard en security_invoker,
-- masquer users.password côté API, RPC pour contrôle email demandes partenaire.

-- ---------------------------------------------------------------------------
-- 1) Vue delivery_leaderboard : exécuter avec les droits de l'appelant (RLS users)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'delivery_leaderboard') THEN
    EXECUTE 'ALTER VIEW public.delivery_leaderboard SET (security_invoker = true)';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Colonne sensible users.password : pas de SELECT via rôles API
-- ---------------------------------------------------------------------------
REVOKE SELECT ON COLUMN public.users.password FROM PUBLIC;
REVOKE SELECT ON COLUMN public.users.password FROM anon;
REVOKE SELECT ON COLUMN public.users.password FROM authenticated;
REVOKE UPDATE ON COLUMN public.users.password FROM PUBLIC;
REVOKE UPDATE ON COLUMN public.users.password FROM anon;
REVOKE UPDATE ON COLUMN public.users.password FROM authenticated;

-- ---------------------------------------------------------------------------
-- 3) RPC : doublon email sur restaurant_requests sans exposer toute la table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restaurant_request_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_requests r
    WHERE lower(trim(r.email)) = lower(trim(p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.restaurant_request_email_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_request_email_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.restaurant_request_email_exists(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Helpers politiques (admin via public.users)
-- ---------------------------------------------------------------------------

-- restaurant_requests : remplacer les politiques JWT incorrectes + RLS strict
ALTER TABLE public.restaurant_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les administrateurs peuvent voir toutes les demandes" ON public.restaurant_requests;
DROP POLICY IF EXISTS "Les administrateurs peuvent mettre à jour les demandes" ON public.restaurant_requests;
DROP POLICY IF EXISTS "Tout le monde peut créer une demande" ON public.restaurant_requests;
DROP POLICY IF EXISTS "Users can view own restaurant requests" ON public.restaurant_requests;
DROP POLICY IF EXISTS "restaurant_requests_own" ON public.restaurant_requests;

CREATE POLICY "restaurant_requests_admin_select"
  ON public.restaurant_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "restaurant_requests_admin_update"
  ON public.restaurant_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "restaurant_requests_public_insert"
  ON public.restaurant_requests FOR INSERT
  WITH CHECK (true);

-- Si la colonne user_id existe : le demandeur connecté peut voir sa ligne
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_requests' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "restaurant_requests_owner_select" ON public.restaurant_requests';
    EXECUTE $p$
      CREATE POLICY "restaurant_requests_owner_select"
        ON public.restaurant_requests FOR SELECT
        USING (user_id IS NOT NULL AND user_id = auth.uid())
    $p$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5) users : activer RLS (les politiques existantes reprennent effet)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6) Menus & dérivés (lecture catalogue)
-- ---------------------------------------------------------------------------
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menus_public_read" ON public.menus;
CREATE POLICY "menus_public_read" ON public.menus FOR SELECT USING (true);

ALTER TABLE public.menu_supplements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_supplements_public_read" ON public.menu_supplements;
CREATE POLICY "menu_supplements_public_read" ON public.menu_supplements FOR SELECT USING (true);

ALTER TABLE public.menu_combos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_combos_public_read" ON public.menu_combos;
CREATE POLICY "menu_combos_public_read" ON public.menu_combos FOR SELECT USING (true);

ALTER TABLE public.menu_combo_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_combo_steps_public_read" ON public.menu_combo_steps;
CREATE POLICY "menu_combo_steps_public_read" ON public.menu_combo_steps FOR SELECT USING (true);

ALTER TABLE public.menu_combo_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_combo_options_public_read" ON public.menu_combo_options;
CREATE POLICY "menu_combo_options_public_read" ON public.menu_combo_options FOR SELECT USING (true);

ALTER TABLE public.menu_combo_option_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_combo_option_variants_public_read" ON public.menu_combo_option_variants;
CREATE POLICY "menu_combo_option_variants_public_read" ON public.menu_combo_option_variants FOR SELECT USING (true);

ALTER TABLE public.menu_combo_option_base_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "menu_combo_option_base_ingredients_public_read" ON public.menu_combo_option_base_ingredients;
CREATE POLICY "menu_combo_option_base_ingredients_public_read" ON public.menu_combo_option_base_ingredients
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 7) commande_details
-- ---------------------------------------------------------------------------
ALTER TABLE public.commande_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commande_details_user_read" ON public.commande_details;
CREATE POLICY "commande_details_user_read" ON public.commande_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.commandes c
      WHERE c.id = commande_details.commande_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "commande_details_user_insert" ON public.commande_details;
CREATE POLICY "commande_details_user_insert" ON public.commande_details
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.commandes c
      WHERE c.id = commande_details.commande_id AND c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 8) Favoris, push livreur, chat, cache géocode, demandes
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_favorites_own" ON public.user_favorites;
CREATE POLICY "user_favorites_own" ON public.user_favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.delivery_push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_push_subscriptions_own" ON public.delivery_push_subscriptions;
CREATE POLICY "delivery_push_subscriptions_own" ON public.delivery_push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_user_read" ON public.chat_messages;
CREATE POLICY "chat_messages_user_read" ON public.chat_messages
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_messages_user_write" ON public.chat_messages;
CREATE POLICY "chat_messages_user_write" ON public.chat_messages
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.geocoded_addresses_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "geocoded_addresses_cache_public" ON public.geocoded_addresses_cache;
CREATE POLICY "geocoded_addresses_cache_public" ON public.geocoded_addresses_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partnership_requests_own" ON public.partnership_requests;
CREATE POLICY "partnership_requests_own" ON public.partnership_requests
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

ALTER TABLE public.advertising_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "advertising_requests_own" ON public.advertising_requests;
CREATE POLICY "advertising_requests_own" ON public.advertising_requests
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

ALTER TABLE public.delivery_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_applications_own" ON public.delivery_applications;
CREATE POLICY "delivery_applications_own" ON public.delivery_applications
  FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "advertisements_public_read" ON public.advertisements;
CREATE POLICY "advertisements_public_read" ON public.advertisements FOR SELECT USING (true);

DROP POLICY IF EXISTS "advertisements_admin_write" ON public.advertisements;
CREATE POLICY "advertisements_admin_write" ON public.advertisements
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY "advertisements_admin_update" ON public.advertisements
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY "advertisements_admin_delete" ON public.advertisements
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Menus & suppléments : écriture par le propriétaire (API partenaire avec JWT utilisateur)
DROP POLICY IF EXISTS "menus_restaurant_write" ON public.menus;
CREATE POLICY "menus_restaurant_write" ON public.menus
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = menus.restaurant_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = menus.restaurant_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "menu_supplements_restaurant_write" ON public.menu_supplements;
CREATE POLICY "menu_supplements_restaurant_write" ON public.menu_supplements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.menus m
      JOIN public.restaurants r ON r.id = m.restaurant_id
      WHERE m.id = menu_supplements.menu_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menus m
      JOIN public.restaurants r ON r.id = m.restaurant_id
      WHERE m.id = menu_supplements.menu_id AND r.user_id = auth.uid()
    )
  );

-- Codes promo : gestion admin (les clients ne voient que is_active via policy read)
DROP POLICY IF EXISTS "promo_codes_admin_manage" ON public.promo_codes;
CREATE POLICY "promo_codes_admin_manage" ON public.promo_codes
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 9) Virements livreurs (admin)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_transfers') THEN
    ALTER TABLE public.delivery_transfers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "delivery_transfers_admin_select" ON public.delivery_transfers;
    DROP POLICY IF EXISTS "delivery_transfers_admin_insert" ON public.delivery_transfers;
    DROP POLICY IF EXISTS "delivery_transfers_admin_update" ON public.delivery_transfers;
    DROP POLICY IF EXISTS "delivery_transfers_admin_delete" ON public.delivery_transfers;
    CREATE POLICY "delivery_transfers_admin_select" ON public.delivery_transfers
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
    CREATE POLICY "delivery_transfers_admin_insert" ON public.delivery_transfers
      FOR INSERT
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
    CREATE POLICY "delivery_transfers_admin_update" ON public.delivery_transfers
      FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
    CREATE POLICY "delivery_transfers_admin_delete" ON public.delivery_transfers
      FOR DELETE
      USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 10) Notifications (inserts serveur = service_role ; Realtime partenaire = SELECT)
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_user_select" ON public.notifications;
CREATE POLICY "notifications_user_select" ON public.notifications
  FOR SELECT
  USING (user_id IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_restaurant_select" ON public.notifications;
CREATE POLICY "notifications_restaurant_select" ON public.notifications
  FOR SELECT
  USING (
    restaurant_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = notifications.restaurant_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;
CREATE POLICY "notifications_user_update" ON public.notifications
  FOR UPDATE
  USING (user_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_restaurant_update" ON public.notifications;
CREATE POLICY "notifications_restaurant_update" ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = notifications.restaurant_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = notifications.restaurant_id AND r.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 11) Codes promo & roue
-- ---------------------------------------------------------------------------
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_codes_public_read_active" ON public.promo_codes;
CREATE POLICY "promo_codes_public_read_active" ON public.promo_codes
  FOR SELECT
  USING (is_active = true);

ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_code_usage_own_read" ON public.promo_code_usage;
CREATE POLICY "promo_code_usage_own_read" ON public.promo_code_usage
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "promo_code_usage_own_insert" ON public.promo_code_usage;
CREATE POLICY "promo_code_usage_own_insert" ON public.promo_code_usage
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.wheel_wins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wheel_wins_own_select" ON public.wheel_wins;
CREATE POLICY "wheel_wins_own_select" ON public.wheel_wins
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wheel_wins_own_insert" ON public.wheel_wins;
CREATE POLICY "wheel_wins_own_insert" ON public.wheel_wins
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wheel_wins_own_update" ON public.wheel_wins;
CREATE POLICY "wheel_wins_own_update" ON public.wheel_wins
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 12) Messagerie partenaires
-- ---------------------------------------------------------------------------
ALTER TABLE public.partner_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_messages_read" ON public.partner_messages;
CREATE POLICY "partner_messages_read" ON public.partner_messages
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.user_id = auth.uid()
        AND (partner_messages.restaurant_id IS NULL OR partner_messages.restaurant_id = r.id)
    )
  );

ALTER TABLE public.partner_message_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_message_reads_restaurant" ON public.partner_message_reads;
CREATE POLICY "partner_message_reads_restaurant" ON public.partner_message_reads
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = partner_message_reads.restaurant_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = partner_message_reads.restaurant_id AND r.user_id = auth.uid()
    )
  );

ALTER TABLE public.partner_message_hidden ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_message_hidden_restaurant" ON public.partner_message_hidden;
CREATE POLICY "partner_message_hidden_restaurant" ON public.partner_message_hidden
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = partner_message_hidden.restaurant_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = partner_message_hidden.restaurant_id AND r.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 13) Audits internes (lecture admin uniquement ; écriture via triggers SECURITY DEFINER)
-- ---------------------------------------------------------------------------
ALTER TABLE public.restaurant_manual_status_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restaurant_manual_status_audit_admin_read" ON public.restaurant_manual_status_audit;
CREATE POLICY "restaurant_manual_status_audit_admin_read" ON public.restaurant_manual_status_audit
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

ALTER TABLE public.restaurant_ferme_manuellement_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restaurant_ferme_manuellement_audit_admin_read" ON public.restaurant_ferme_manuellement_audit;
CREATE POLICY "restaurant_ferme_manuellement_audit_admin_read" ON public.restaurant_ferme_manuellement_audit
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
