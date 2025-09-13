-- Création de la table des suppléments pour les restaurants
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS supplements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    category VARCHAR(100) DEFAULT 'général',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_supplements_restaurant_id ON supplements(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_supplements_active ON supplements(is_active);

-- Activer RLS (Row Level Security)
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Supplements are viewable by authenticated users" ON supplements
    FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour permettre la modification seulement au propriétaire du restaurant
CREATE POLICY "Restaurant owners can manage supplements" ON supplements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM restaurants 
            WHERE restaurants.id = supplements.restaurant_id 
            AND restaurants.user_id = auth.uid()
        )
    );

-- Insérer quelques suppléments d'exemple pour le restaurant "La Bonne Pâte"
INSERT INTO supplements (restaurant_id, name, price, category, description) VALUES
(
    (SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1),
    'Fromage supplémentaire',
    2.00,
    'fromage',
    'Portion supplémentaire de mozzarella'
),
(
    (SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1),
    'Pepperoni supplémentaire',
    2.50,
    'viande',
    'Portion supplémentaire de pepperoni'
),
(
    (SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1),
    'Champignons supplémentaires',
    1.50,
    'légumes',
    'Portion supplémentaire de champignons frais'
),
(
    (SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1),
    'Olives supplémentaires',
    1.00,
    'légumes',
    'Portion supplémentaire d''olives noires'
),
(
    (SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1),
    'Artichauts supplémentaires',
    2.00,
    'légumes',
    'Portion supplémentaire d''artichauts'
),
(
    (SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1),
    'Jambon supplémentaire',
    2.50,
    'viande',
    'Portion supplémentaire de jambon'
),
(
    (SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1),
    'Basilic supplémentaire',
    1.00,
    'herbes',
    'Portion supplémentaire de basilic frais'
),
(
    (SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1),
    'Tomates fraîches',
    1.50,
    'légumes',
    'Portion supplémentaire de tomates fraîches'
);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_supplements_updated_at 
    BEFORE UPDATE ON supplements 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
