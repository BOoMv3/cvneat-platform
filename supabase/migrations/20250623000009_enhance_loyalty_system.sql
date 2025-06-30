-- Amélioration du système de fidélité
-- Ajouter les colonnes manquantes à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS loyalty_level VARCHAR(20) DEFAULT 'Bronze',
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points_spent INTEGER DEFAULT 0;

-- Table pour l'historique des points de fidélité
CREATE TABLE IF NOT EXISTS loyalty_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    points_earned INTEGER DEFAULT 0,
    points_spent INTEGER DEFAULT 0,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_loyalty_history_user_id ON loyalty_history(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_order_id ON loyalty_history(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_created_at ON loyalty_history(created_at DESC);

-- Fonction pour calculer le niveau de fidélité
CREATE OR REPLACE FUNCTION calculate_loyalty_level(total_spent DECIMAL)
RETURNS VARCHAR AS $$
BEGIN
    RETURN CASE
        WHEN total_spent >= 1000 THEN 'Diamant'
        WHEN total_spent >= 500 THEN 'Platine'
        WHEN total_spent >= 200 THEN 'Or'
        WHEN total_spent >= 100 THEN 'Argent'
        ELSE 'Bronze'
    END;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer les points gagnés
CREATE OR REPLACE FUNCTION calculate_points_earned(order_amount DECIMAL)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(order_amount * 10); -- 10 points par euro dépensé
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement le niveau de fidélité
CREATE OR REPLACE FUNCTION update_loyalty_level()
RETURNS TRIGGER AS $$
BEGIN
    NEW.loyalty_level = calculate_loyalty_level(NEW.total_spent);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_loyalty_level ON users;
CREATE TRIGGER trigger_update_loyalty_level
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_loyalty_level(); 