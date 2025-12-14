-- Table pour stocker les gains de la roue de la chance
CREATE TABLE IF NOT EXISTS wheel_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES commandes(id) ON DELETE SET NULL,
  prize_type VARCHAR(50) NOT NULL, -- 'discount', 'free_delivery', 'free_drink', 'surprise'
  prize_value DECIMAL(10,2), -- Pour les réductions
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  promo_code VARCHAR(50), -- Code généré (ex: ROULETTEABC123)
  description TEXT, -- Description du gain
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE, -- Quand le code a été utilisé
  used_in_order_id UUID REFERENCES commandes(id) ON DELETE SET NULL, -- Commande où utilisé
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_wheel_wins_user ON wheel_wins(user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_wins_valid ON wheel_wins(valid_until, used_at);
CREATE INDEX IF NOT EXISTS idx_wheel_wins_code ON wheel_wins(promo_code);

-- Commentaire
COMMENT ON TABLE wheel_wins IS 'Gains de la roue de la chance - Permet au client de voir ses codes actifs';

