-- Notifications partenaire → admin (ex: "J'ai fait les changements de prix")
CREATE TABLE IF NOT EXISTS partner_price_change_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  message TEXT DEFAULT 'Le partenaire a terminé les modifications de prix.'
);

CREATE INDEX IF NOT EXISTS idx_partner_price_notif_restaurant ON partner_price_change_notifications(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_partner_price_notif_created ON partner_price_change_notifications(created_at DESC);

ALTER TABLE partner_price_change_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: les partenaires peuvent insérer pour leur restaurant, les admins peuvent tout lire
CREATE POLICY "Partners can insert for own restaurant"
  ON partner_price_change_notifications FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all"
  ON partner_price_change_notifications FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
