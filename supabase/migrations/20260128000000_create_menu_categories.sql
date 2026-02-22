-- Table menu_categories pour l'ordre d'affichage des sections côté client
-- Permet aux partenaires de réordonner (Entrées, Plats, Desserts, Boissons...)
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_sort ON menu_categories(restaurant_id, sort_order);

-- RLS: lecture publique pour la fiche restaurant, modification par le propriétaire
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read menu_categories" ON menu_categories;
CREATE POLICY "Public read menu_categories" ON menu_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Restaurant owner manage menu_categories" ON menu_categories;
CREATE POLICY "Restaurant owner manage menu_categories" ON menu_categories
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE user_id = auth.uid())
  );
