-- Permettre aux partenaires de masquer/supprimer des messages de leur vue
CREATE TABLE IF NOT EXISTS partner_message_hidden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES partner_messages(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_message_hidden_lookup ON partner_message_hidden(message_id, restaurant_id);
