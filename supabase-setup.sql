-- Script de création de la table orders pour CVN'Eat
-- À exécuter dans le SQL Editor de Supabase

-- Créer la table orders
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_city TEXT NOT NULL,
    delivery_postal_code TEXT NOT NULL,
    delivery_instructions TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'preparing', 'ready', 'delivered')),
    status_reason TEXT,
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur restaurant_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);

-- Créer un index sur status pour filtrer rapidement
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Créer un index sur created_at pour trier par date
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS (Row Level Security) si nécessaire
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture des commandes (à adapter selon vos besoins)
CREATE POLICY "Allow read access to orders" ON orders
    FOR SELECT USING (true);

-- Politique pour permettre l'insertion de nouvelles commandes
CREATE POLICY "Allow insert orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Politique pour permettre la mise à jour des commandes
CREATE POLICY "Allow update orders" ON orders
    FOR UPDATE USING (true);

-- Commentaires pour documenter la table
COMMENT ON TABLE orders IS 'Table des commandes de CVN''Eat';
COMMENT ON COLUMN orders.status IS 'Statut de la commande: pending, accepted, rejected, preparing, ready, delivered';
COMMENT ON COLUMN orders.items IS 'Articles de la commande au format JSONB';
COMMENT ON COLUMN orders.status_reason IS 'Raison du refus si la commande est rejetée'; 