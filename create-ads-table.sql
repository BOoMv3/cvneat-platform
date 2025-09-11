-- Création de la table des publicités
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  position VARCHAR(50) NOT NULL CHECK (position IN ('banner_top', 'banner_middle', 'sidebar_left', 'sidebar_right', 'popup', 'footer')),
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  advertiser_name VARCHAR(255) NOT NULL,
  advertiser_email VARCHAR(255),
  advertiser_phone VARCHAR(20),
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_advertisements_position ON advertisements(position);
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON advertisements(start_date, end_date);

-- RLS (Row Level Security)
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

-- Politique pour les admins (lecture et écriture)
CREATE POLICY "Admins can manage advertisements" ON advertisements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Politique pour les utilisateurs (lecture seule des publicités actives)
CREATE POLICY "Users can view active advertisements" ON advertisements
  FOR SELECT USING (
    is_active = true 
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

-- Données de test
INSERT INTO advertisements (title, description, image_url, link_url, position, is_active, price, advertiser_name, advertiser_email, advertiser_phone) VALUES
('Restaurant Le Bistrot', 'Découvrez nos spécialités locales', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400', 'https://example.com', 'banner_top', true, 50.00, 'Le Bistrot', 'contact@lebistrot.fr', '04 67 12 34 56'),
('Pizzeria Bella Vista', 'Pizzas artisanales au feu de bois', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400', 'https://example.com', 'sidebar_left', true, 30.00, 'Bella Vista', 'info@bellavista.fr', '04 67 23 45 67'),
('Boulangerie Artisanale', 'Pain frais tous les matins', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', 'https://example.com', 'footer', true, 25.00, 'Boulangerie du Centre', 'boulangerie@centre.fr', '04 67 34 56 78');
