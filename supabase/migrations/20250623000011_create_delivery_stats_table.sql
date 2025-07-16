-- Migration pour créer la table delivery_stats
-- Date: 2025-06-23

-- Création de la table delivery_stats
CREATE TABLE IF NOT EXISTS delivery_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_deliveries INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    last_month_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_distance_km DECIMAL(10,2) DEFAULT 0.00,
    total_time_hours DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_delivery_stats_delivery_id ON delivery_stats(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stats_created_at ON delivery_stats(created_at);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_delivery_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_delivery_stats_updated_at
    BEFORE UPDATE ON delivery_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_delivery_stats_updated_at();

-- Politique RLS pour la sécurité
ALTER TABLE delivery_stats ENABLE ROW LEVEL SECURITY;

-- Politique pour que les livreurs ne voient que leurs propres stats
CREATE POLICY "Livreurs peuvent voir leurs propres stats" ON delivery_stats
    FOR SELECT USING (auth.uid() = delivery_id);

-- Politique pour que les livreurs puissent mettre à jour leurs stats
CREATE POLICY "Livreurs peuvent mettre à jour leurs stats" ON delivery_stats
    FOR UPDATE USING (auth.uid() = delivery_id);

-- Politique pour que les admins puissent voir toutes les stats
CREATE POLICY "Admins peuvent voir toutes les stats" ON delivery_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role LIKE '%admin%'
        )
    );

-- Fonction pour calculer automatiquement les statistiques
CREATE OR REPLACE FUNCTION calculate_delivery_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour les stats du livreur quand une commande est livrée
    IF NEW.status = 'livree' AND OLD.status != 'livree' THEN
        INSERT INTO delivery_stats (delivery_id, total_deliveries, total_earnings)
        VALUES (NEW.delivery_id, 1, COALESCE(NEW.frais_livraison, 0))
        ON CONFLICT (delivery_id) DO UPDATE SET
            total_deliveries = delivery_stats.total_deliveries + 1,
            total_earnings = delivery_stats.total_earnings + COALESCE(EXCLUDED.total_earnings, 0),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement les stats
CREATE TRIGGER trigger_calculate_delivery_stats
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_delivery_stats(); 