-- Messagerie admin -> partenaires
CREATE TABLE IF NOT EXISTS partner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT ''
);

-- restaurant_id = NULL => message broadcast (tous les partenaires)
-- restaurant_id = uuid => message individuel

CREATE INDEX IF NOT EXISTS idx_partner_messages_restaurant ON partner_messages(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_partner_messages_created ON partner_messages(created_at DESC);

-- Suivi des messages lus (pour broadcast et individuels)
CREATE TABLE IF NOT EXISTS partner_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES partner_messages(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_message_reads_lookup ON partner_message_reads(message_id, restaurant_id);
