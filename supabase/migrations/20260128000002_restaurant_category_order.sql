-- Ordre des catégories défini par le partenaire (sans menu_categories)
-- Tableau de noms de catégories dans l'ordre souhaité
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS category_order JSONB DEFAULT NULL;
