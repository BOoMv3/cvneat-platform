-- Script SQL pour créer les tables de formules
-- Permet aux partenaires de créer des formules (entrée + plat, plat + dessert, etc.)
-- en réutilisant des plats existants

-- Table principale des formules
CREATE TABLE IF NOT EXISTS formulas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    prix_reduit DECIMAL(10,2), -- Prix réduit par rapport à la somme des plats individuels
    image_url TEXT,
    category VARCHAR(100) DEFAULT 'formule',
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table de liaison entre formules et items de menu
CREATE TABLE IF NOT EXISTS formula_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0, -- Ordre d'affichage dans la formule
    quantity INTEGER DEFAULT 1, -- Quantité de cet item dans la formule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(formula_id, menu_id, order_index)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_formulas_restaurant_id ON formulas(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_formulas_disponible ON formulas(disponible);
CREATE INDEX IF NOT EXISTS idx_formula_items_formula_id ON formula_items(formula_id);
CREATE INDEX IF NOT EXISTS idx_formula_items_menu_id ON formula_items(menu_id);

-- Commentaires pour documenter
COMMENT ON TABLE formulas IS 'Formules proposées par les restaurants (ex: entrée + plat, plat + dessert + boisson)';
COMMENT ON TABLE formula_items IS 'Liaison entre les formules et les items de menu qui les composent';
COMMENT ON COLUMN formulas.prix_reduit IS 'Prix réduit de la formule par rapport à la somme des plats individuels (optionnel)';
COMMENT ON COLUMN formula_items.order_index IS 'Ordre d''affichage des items dans la formule (0 = premier, 1 = deuxième, etc.)';
COMMENT ON COLUMN formula_items.quantity IS 'Quantité de cet item dans la formule (par défaut 1)';

-- RLS (Row Level Security)
ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_items ENABLE ROW LEVEL SECURITY;

-- Policies pour formulas
CREATE POLICY "Restaurants can view their own formulas"
    ON formulas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = formulas.restaurant_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurants can insert their own formulas"
    ON formulas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = formulas.restaurant_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurants can update their own formulas"
    ON formulas FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = formulas.restaurant_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurants can delete their own formulas"
    ON formulas FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM restaurants r
            WHERE r.id = formulas.restaurant_id
            AND r.user_id = auth.uid()
        )
    );

-- Policies pour formula_items
CREATE POLICY "Restaurants can view their own formula items"
    ON formula_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM formulas f
            JOIN restaurants r ON r.id = f.restaurant_id
            WHERE f.id = formula_items.formula_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurants can insert their own formula items"
    ON formula_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM formulas f
            JOIN restaurants r ON r.id = f.restaurant_id
            WHERE f.id = formula_items.formula_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurants can update their own formula items"
    ON formula_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM formulas f
            JOIN restaurants r ON r.id = f.restaurant_id
            WHERE f.id = formula_items.formula_id
            AND r.user_id = auth.uid()
        )
    );

CREATE POLICY "Restaurants can delete their own formula items"
    ON formula_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM formulas f
            JOIN restaurants r ON r.id = f.restaurant_id
            WHERE f.id = formula_items.formula_id
            AND r.user_id = auth.uid()
        )
    );

-- Policy pour permettre aux clients de voir les formules disponibles
CREATE POLICY "Clients can view available formulas"
    ON formulas FOR SELECT
    USING (disponible = true);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_formulas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_formulas_updated_at
    BEFORE UPDATE ON formulas
    FOR EACH ROW
    EXECUTE FUNCTION update_formulas_updated_at();

