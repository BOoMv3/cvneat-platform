-- Migration pour ajouter les colonnes d'estimation du temps à la table orders
-- Date: 2025-06-23

-- Ajouter les colonnes pour l'estimation du temps
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparation_time INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_total_time INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES auth.users(id);

-- Ajouter des contraintes pour les temps
ALTER TABLE orders ADD CONSTRAINT check_preparation_time CHECK (preparation_time >= 5 AND preparation_time <= 60);
ALTER TABLE orders ADD CONSTRAINT check_delivery_time CHECK (delivery_time >= 5 AND delivery_time <= 45);
ALTER TABLE orders ADD CONSTRAINT check_estimated_total_time CHECK (estimated_total_time >= 10 AND estimated_total_time <= 90);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_orders_accepted_by ON orders(accepted_by);
CREATE INDEX IF NOT EXISTS idx_orders_accepted_at ON orders(accepted_at);

-- Fonction pour calculer automatiquement le temps total
CREATE OR REPLACE FUNCTION calculate_total_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.preparation_time IS NOT NULL AND NEW.delivery_time IS NOT NULL THEN
        NEW.estimated_total_time = NEW.preparation_time + NEW.delivery_time;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement le temps total
CREATE TRIGGER trigger_calculate_total_time
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_time();

-- Mettre à jour les commandes existantes avec des valeurs par défaut
UPDATE orders 
SET 
    preparation_time = 15,
    delivery_time = 20,
    estimated_total_time = 35
WHERE preparation_time IS NULL; 