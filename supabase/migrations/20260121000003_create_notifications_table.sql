-- Table notifications (clients + restaurants)
-- Certaines routes API attendent cette table. Sans elle, les compteurs "notif créées" resteront à 0.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Notifications utilisateur (client/admin)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  title TEXT,

  -- Notifications restaurant (dashboard partenaire)
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  lu BOOLEAN NOT NULL DEFAULT false,
  order_id UUID,

  type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id ON notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_lu ON notifications(lu);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Pour que les endpoints actuels fonctionnent (ils utilisent le client Supabase côté serveur sans propager le token),
-- on désactive RLS. Si tu veux sécuriser, on pourra ensuite passer ces routes en service_role + policies.
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Activer Realtime sur la table (nécessaire pour que les dashboards partenaires reçoivent l'INSERT en direct)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      -- Déjà ajouté
      NULL;
    WHEN undefined_object THEN
      -- Publication absente (rare) : ignorer
      NULL;
  END;
END $$;


