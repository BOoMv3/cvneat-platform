-- Création de la table des catégories de menus
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_sort_order ON menu_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_categories_active ON menu_categories(is_active);

-- Ajouter la colonne category_id à la table menus existante
ALTER TABLE menus ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES menu_categories(id);

-- Créer un index pour la nouvelle colonne
CREATE INDEX IF NOT EXISTS idx_menus_category_id ON menus(category_id);

-- Insérer quelques catégories par défaut pour le restaurant existant
INSERT INTO menu_categories (restaurant_id, name, description, sort_order) VALUES
  ('4572cee6-1fc6-4f32-b007-57c46871ec70', 'Pizzas', 'Nos délicieuses pizzas artisanales', 1),
  ('4572cee6-1fc6-4f32-b007-57c46871ec70', 'Boissons', 'Rafraîchissements et boissons chaudes', 2),
  ('4572cee6-1fc6-4f32-b007-57c46871ec70', 'Desserts', 'Gourmandises et pâtisseries', 3),
  ('4572cee6-1fc6-4f32-b007-57c46871ec70', 'Entrées', 'Apéritifs et mises en bouche', 4)
ON CONFLICT DO NOTHING;

-- Mettre à jour les menus existants avec des catégories par défaut
UPDATE menus 
SET category_id = (
  SELECT id FROM menu_categories 
  WHERE restaurant_id = menus.restaurant_id 
  AND name = 'Pizzas' 
  LIMIT 1
)
WHERE category_id IS NULL 
AND restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70';

-- Créer une vue pour faciliter l'affichage des menus avec catégories
CREATE OR REPLACE VIEW menus_with_categories AS
SELECT 
  m.*,
  mc.name as category_name,
  mc.description as category_description,
  mc.sort_order as category_sort_order
FROM menus m
LEFT JOIN menu_categories mc ON m.category_id = mc.id
WHERE mc.is_active = true
ORDER BY mc.sort_order, m.name;

-- Permissions
GRANT ALL ON menu_categories TO authenticated;
GRANT ALL ON menus_with_categories TO authenticated; 