-- Migration pour créer la table restaurant_transfers
-- Cette table permet de suivre tous les virements effectués aux restaurants partenaires

-- Table pour suivre les virements aux restaurants
CREATE TABLE IF NOT EXISTS restaurant_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  
  -- Détails du virement
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL,
  reference_number TEXT, -- Numéro de référence du virement bancaire
  notes TEXT, -- Notes additionnelles
  
  -- Période couverte par ce virement
  period_start DATE,
  period_end DATE,
  
  -- Statut
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_restaurant_transfers_restaurant_id ON restaurant_transfers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_transfers_transfer_date ON restaurant_transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_transfers_status ON restaurant_transfers(status);

-- RLS Policies
ALTER TABLE restaurant_transfers ENABLE ROW LEVEL SECURITY;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_restaurant_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurant_transfers_updated_at
    BEFORE UPDATE ON restaurant_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_restaurant_transfers_updated_at();

-- RLS Policies
-- Seuls les admins peuvent voir tous les virements
CREATE POLICY "Admins can view all transfers"
  ON restaurant_transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Seuls les admins peuvent créer des virements
CREATE POLICY "Admins can create transfers"
  ON restaurant_transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Seuls les admins peuvent modifier les virements
CREATE POLICY "Admins can update transfers"
  ON restaurant_transfers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Seuls les admins peuvent supprimer les virements
CREATE POLICY "Admins can delete transfers"
  ON restaurant_transfers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Commentaires
COMMENT ON TABLE restaurant_transfers IS 'Enregistrement des virements effectués aux restaurants';
COMMENT ON COLUMN restaurant_transfers.restaurant_name IS 'Nom du restaurant (stocké pour référence historique)';
COMMENT ON COLUMN restaurant_transfers.reference_number IS 'Numéro de référence du virement bancaire';
COMMENT ON COLUMN restaurant_transfers.period_start IS 'Date de début de la période couverte par ce virement';
COMMENT ON COLUMN restaurant_transfers.period_end IS 'Date de fin de la période couverte par ce virement';

