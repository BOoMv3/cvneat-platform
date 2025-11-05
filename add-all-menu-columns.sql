-- Script SQL complet pour ajouter toutes les colonnes nécessaires aux menus et details_commande
-- À exécuter dans Supabase SQL Editor

-- ============================================
-- 1. COLONNES POUR LES BOISSONS
-- ============================================
ALTER TABLE menus 
ADD COLUMN IF NOT EXISTS is_drink BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS drink_size VARCHAR(50),
ADD COLUMN IF NOT EXISTS drink_price_small DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS drink_price_medium DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS drink_price_large DECIMAL(10,2);

-- Commentaires pour documenter
COMMENT ON COLUMN menus.is_drink IS 'Indique si l''item est une boisson';
COMMENT ON COLUMN menus.drink_size IS 'Taille de la boisson (ex: 33cl, 50cl, 1L)';
COMMENT ON COLUMN menus.drink_price_small IS 'Prix pour la taille petite';
COMMENT ON COLUMN menus.drink_price_medium IS 'Prix pour la taille moyenne';
COMMENT ON COLUMN menus.drink_price_large IS 'Prix pour la taille grande';

-- ============================================
-- 2. COLONNES POUR LA CUSTOMISATION (VIANDES, SAUCES, INGRÉDIENTS)
-- ============================================
ALTER TABLE menus 
ADD COLUMN IF NOT EXISTS meat_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS sauce_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS base_ingredients JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS requires_meat_selection BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_sauce_selection BOOLEAN DEFAULT false;

-- Commentaires pour documenter
COMMENT ON COLUMN menus.meat_options IS 'Tableau JSON des options de viande disponibles. Format: [{"id": "chicken", "nom": "Poulet", "prix": 0, "default": true}, ...]';
COMMENT ON COLUMN menus.sauce_options IS 'Tableau JSON des options de sauce disponibles. Format: [{"id": "blanche", "nom": "Sauce blanche", "prix": 0}, ...]';
COMMENT ON COLUMN menus.base_ingredients IS 'Tableau JSON des ingrédients de base inclus dans le plat (qui peuvent être retirés). Format: [{"id": "tomato", "nom": "Tomate", "removable": true}, ...]';
COMMENT ON COLUMN menus.requires_meat_selection IS 'Si true, le client doit choisir au moins une viande parmi les options';
COMMENT ON COLUMN menus.requires_sauce_selection IS 'Si true, le client doit choisir au moins une sauce parmi les options';

-- ============================================
-- 3. COLONNE CUSTOMIZATIONS DANS DETAILS_COMMANDE
-- ============================================
ALTER TABLE details_commande 
ADD COLUMN IF NOT EXISTS customizations JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN details_commande.customizations IS 'Stocke les customizations du client : viandes sélectionnées, sauces sélectionnées, ingrédients retirés. Format: {"selectedMeats": [...], "selectedSauces": [...], "removedIngredients": [...]}';

-- ============================================
-- 4. INDEX POUR AMÉLIORER LES PERFORMANCES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_menus_is_drink ON menus(is_drink);
CREATE INDEX IF NOT EXISTS idx_menus_requires_meat_selection ON menus(requires_meat_selection);
CREATE INDEX IF NOT EXISTS idx_menus_requires_sauce_selection ON menus(requires_sauce_selection);
CREATE INDEX IF NOT EXISTS idx_details_commande_customizations ON details_commande USING GIN (customizations);

-- ============================================
-- 5. VÉRIFICATION
-- ============================================
-- Afficher les colonnes ajoutées (pour vérification)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'menus' 
  AND column_name IN ('is_drink', 'drink_size', 'drink_price_small', 'drink_price_medium', 'drink_price_large', 'meat_options', 'sauce_options', 'base_ingredients', 'requires_meat_selection', 'requires_sauce_selection')
ORDER BY column_name;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'details_commande' 
  AND column_name = 'customizations';

