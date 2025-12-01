-- Table pour suivre les virements effectués aux restaurants
CREATE TABLE IF NOT EXISTS restaurant_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Montant du virement
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    
    -- Période couverte par le virement
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Informations du virement
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transfer_reference VARCHAR(255), -- Référence du virement bancaire
    payment_method VARCHAR(50) DEFAULT 'bank_transfer', -- bank_transfer, check, cash, etc.
    
    -- Notes et commentaires
    notes TEXT,
    
    -- Statut
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    
    -- Créé par
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Contrainte: période valide
    CONSTRAINT valid_period CHECK (period_end >= period_start)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_restaurant_transfers_restaurant_id ON restaurant_transfers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_transfers_transfer_date ON restaurant_transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_transfers_period ON restaurant_transfers(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_restaurant_transfers_status ON restaurant_transfers(status);

-- RLS Policies
ALTER TABLE restaurant_transfers ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout voir et modifier
CREATE POLICY "Admins can manage all transfers"
    ON restaurant_transfers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Commentaires
COMMENT ON TABLE restaurant_transfers IS 'Enregistrement des virements effectués aux restaurants';
COMMENT ON COLUMN restaurant_transfers.transfer_reference IS 'Référence du virement bancaire (numéro de transaction, chèque, etc.)';
COMMENT ON COLUMN restaurant_transfers.period_start IS 'Date de début de la période couverte par ce virement';
COMMENT ON COLUMN restaurant_transfers.period_end IS 'Date de fin de la période couverte par ce virement';

