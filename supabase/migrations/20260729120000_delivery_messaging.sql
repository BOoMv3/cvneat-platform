-- Messagerie livreurs : admin/système → livreurs + DM livreur↔ livreur

CREATE TABLE IF NOT EXISTS delivery_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- admin_id NULL pour messages système (paiement, docs, etc.)
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- delivery_user_id NULL = broadcast à tous les livreurs
  delivery_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  -- admin | system
  kind TEXT NOT NULL DEFAULT 'admin'
    CHECK (kind IN ('admin', 'system')),
  -- payment_made | missing_docs | custom | ...
  event_type TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_delivery_messages_user ON delivery_messages(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_messages_created ON delivery_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_messages_kind ON delivery_messages(kind);

CREATE TABLE IF NOT EXISTS delivery_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES delivery_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_message_reads_lookup
  ON delivery_message_reads(message_id, user_id);

-- Conversations 1:1 entre livreurs (user_a < user_b pour unicité)
CREATE TABLE IF NOT EXISTS delivery_dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT delivery_dm_threads_ordered CHECK (user_a < user_b),
  CONSTRAINT delivery_dm_threads_unique UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_delivery_dm_threads_users
  ON delivery_dm_threads(user_a, user_b);

CREATE TABLE IF NOT EXISTS delivery_dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  thread_id UUID NOT NULL REFERENCES delivery_dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  CONSTRAINT delivery_dm_messages_body_not_empty CHECK (length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_delivery_dm_messages_thread
  ON delivery_dm_messages(thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS delivery_dm_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES delivery_dm_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

ALTER TABLE delivery_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_dm_reads ENABLE ROW LEVEL SECURITY;

-- Accès via service role (APIs). Policies lecture pour livreurs connectés (optionnel Realtime).
CREATE POLICY delivery_messages_select_own ON delivery_messages
  FOR SELECT TO authenticated
  USING (
    delivery_user_id IS NULL
    OR delivery_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY delivery_message_reads_own ON delivery_message_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY delivery_dm_threads_participants ON delivery_dm_threads
  FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY delivery_dm_messages_participants ON delivery_dm_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_dm_threads t
      WHERE t.id = thread_id AND (t.user_a = auth.uid() OR t.user_b = auth.uid())
    )
  );

CREATE POLICY delivery_dm_reads_own ON delivery_dm_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE delivery_messages IS 'Inbox admin/système vers livreurs (broadcast si delivery_user_id NULL)';
COMMENT ON TABLE delivery_dm_threads IS 'Threads DM 1:1 entre livreurs';
