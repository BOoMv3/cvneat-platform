-- Migration pour créer la gestion des suppléments de menu
-- Date: 2025-06-23

-- Créer la table des suppléments
CREATE TABLE IF NOT EXISTS menu_supplements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    disponible BOOLEAN DEFAULT true,
    ordre INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table des suppléments de commande
CREATE TABLE IF NOT EXISTS order_supplements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
    supplement_id UUID REFERENCES menu_supplements(id) ON DELETE CASCADE,
    prix DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter des colonnes pour les boissons
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_drink BOOLEAN DEFAULT false;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS drink_size VARCHAR(50);
ALTER TABLE menus ADD COLUMN IF NOT EXISTS drink_price_small DECIMAL(10,2);
ALTER TABLE menus ADD COLUMN IF NOT EXISTS drink_price_medium DECIMAL(10,2);
ALTER TABLE menus ADD COLUMN IF NOT EXISTS drink_price_large DECIMAL(10,2);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_menu_supplements_menu_item_id ON menu_supplements(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_supplements_order_item_id ON order_supplements(order_item_id);
CREATE INDEX IF NOT EXISTS idx_menus_is_drink ON menus(is_drink);

-- Activer RLS
ALTER TABLE menu_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_supplements ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les suppléments
CREATE POLICY "Anyone can view available supplements"
    ON menu_supplements FOR SELECT
    USING (disponible = true);

CREATE POLICY "Restaurant partners can manage their supplements"
    ON menu_supplements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM menus m
            JOIN restaurants r ON m.restaurant_id = r.id
            WHERE m.id = menu_supplements.menu_item_id
            AND r.user_id = auth.uid()
        )
    );

-- Politiques RLS pour les suppléments de commande
CREATE POLICY "Users can view their own order supplements"
    ON order_supplements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.id = order_supplements.order_item_id
            AND o.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurant partners can view supplements for their orders"
    ON order_supplements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM order_items oi
            JOIN menus m ON oi.menu_id = m.id
            JOIN restaurants r ON m.restaurant_id = r.id
            WHERE oi.id = order_supplements.order_item_id
            AND r.user_id = auth.uid()
        )
    ); 