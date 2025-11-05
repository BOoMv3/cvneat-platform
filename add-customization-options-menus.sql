-- Script SQL pour ajouter les colonnes de customisation aux menus
-- Permet de gérer les choix de viande, sauces et ingrédients de base

-- Ajouter les colonnes pour les options de customisation
ALTER TABLE menus 
ADD COLUMN IF NOT EXISTS meat_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sauce_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS base_ingredients JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS requires_meat_selection BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_sauce_selection BOOLEAN DEFAULT false;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN menus.meat_options IS 'Tableau JSON des options de viande disponibles. Format: [{"id": "chicken", "nom": "Poulet", "prix": 0, "default": true}, ...]';
COMMENT ON COLUMN menus.sauce_options IS 'Tableau JSON des options de sauce disponibles. Format: [{"id": "blanche", "nom": "Sauce blanche", "prix": 0}, ...]';
COMMENT ON COLUMN menus.base_ingredients IS 'Tableau JSON des ingrédients de base inclus dans le plat (qui peuvent être retirés). Format: [{"id": "tomato", "nom": "Tomate", "removable": true}, ...]';
COMMENT ON COLUMN menus.requires_meat_selection IS 'Si true, le client doit choisir au moins une viande parmi les options';
COMMENT ON COLUMN menus.requires_sauce_selection IS 'Si true, le client doit choisir au moins une sauce parmi les options';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_menus_requires_meat_selection ON menus(requires_meat_selection);
CREATE INDEX IF NOT EXISTS idx_menus_requires_sauce_selection ON menus(requires_sauce_selection);

