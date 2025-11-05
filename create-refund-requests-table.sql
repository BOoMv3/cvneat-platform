-- Table pour les demandes de remboursement
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    
    -- Détails du remboursement
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled')),
    
    -- Stripe
    stripe_payment_intent_id VARCHAR(255),
    stripe_refund_id VARCHAR(255),
    stripe_refund_status VARCHAR(50),
    
    -- Réponse admin
    admin_response TEXT,
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Contraintes
    CONSTRAINT valid_refund_amount CHECK (amount > 0)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_refund_requests_order_id ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at ON refund_requests(created_at DESC);

-- RLS Policies
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent voir leurs propres demandes
CREATE POLICY "Clients can view own refund requests"
    ON refund_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Les restaurants peuvent voir les demandes pour leurs commandes
CREATE POLICY "Restaurants can view refund requests for their orders"
    ON refund_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM restaurants
            WHERE restaurants.id = refund_requests.restaurant_id
            AND restaurants.user_id = auth.uid()
        )
    );

-- Les admins peuvent tout voir (via service_role_key)
-- Pas besoin de policy pour les admins, ils utilisent supabaseAdmin

COMMENT ON TABLE refund_requests IS 'Demandes de remboursement des clients';
COMMENT ON COLUMN refund_requests.status IS 'Statut: pending, approved, rejected, processing, completed, cancelled';

