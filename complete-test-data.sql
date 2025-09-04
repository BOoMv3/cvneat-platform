-- SCRIPT COMPLET POUR CRÉER TOUTES LES DONNÉES DE TEST
-- À exécuter dans Supabase SQL Editor - UNE SEULE FOIS

-- ============================================
-- 1. CRÉER LES TABLES SI ELLES N'EXISTENT PAS
-- ============================================

-- Table users (structure Supabase)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    adresse TEXT NOT NULL,
    code_postal VARCHAR(10) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'restaurant', 'delivery')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table restaurants (structure Supabase)
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    adresse TEXT NOT NULL,
    code_postal VARCHAR(10) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    type_cuisine VARCHAR(100) NOT NULL,
    horaires JSON,
    categories JSON,
    image_url VARCHAR(255),
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table menus (structure Supabase)
CREATE TABLE IF NOT EXISTS menus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    category VARCHAR(100),
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table orders (structure existante)
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
    delivery_id UUID REFERENCES users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivery_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table order_items
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. INSÉRER LES DONNÉES DE TEST
-- ============================================

-- Créer un propriétaire de restaurant
INSERT INTO users (id, nom, prenom, email, password, telephone, adresse, code_postal, ville, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Restaurant',
  'Owner',
  'owner@labonnepate.fr',
  'password123',
  '0123456789',
  '123 Rue du Restaurant',
  '75001',
  'Paris',
  'restaurant',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Créer un livreur de test
INSERT INTO users (id, nom, prenom, email, password, telephone, adresse, code_postal, ville, role, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Dupont',
  'Jean',
  'livreur@cvneat.fr',
  'password123',
  '0123456789',
  '123 Rue des Livreurs',
  '75001',
  'Paris',
  'delivery',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Créer un client de test
INSERT INTO users (id, nom, prenom, email, password, telephone, adresse, code_postal, ville, role, created_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Martin',
  'Marie',
  'client@cvneat.fr',
  'password123',
  '0987654321',
  '456 Avenue des Clients',
  '75002',
  'Paris',
  'user',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Créer le restaurant "La Bonne Pâte"
INSERT INTO restaurants (id, nom, description, adresse, code_postal, ville, telephone, email, type_cuisine, user_id, status, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'La Bonne Pâte',
  'Pizzeria artisanale avec des ingrédients frais',
  '123 Rue de la Paix',
  '75001',
  'Paris',
  '0123456789',
  'contact@labonnepate.fr',
  'Italienne',
  '00000000-0000-0000-0000-000000000001',
  'active',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insérer les plats du restaurant
INSERT INTO menus (restaurant_id, nom, description, prix, image_url, category, disponible, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Pizza Margherita', 'Sauce tomate, mozzarella, basilic frais', 12.90, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3', 'Pizzas', true, NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Pizza Quatre Fromages', 'Mozzarella, gorgonzola, parmesan, chèvre', 15.90, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002', 'Pizzas', true, NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Pizza Prosciutto', 'Tomate, mozzarella, jambon de Parme, roquette', 16.90, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b', 'Pizzas', true, NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Tiramisu', 'Mascarpone, café, cacao, biscuits', 6.90, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9', 'Desserts', true, NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Panna Cotta', 'Crème vanille, coulis de fruits rouges', 5.90, 'https://images.unsplash.com/photo-1551024506-0bccd828d307', 'Desserts', true, NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Coca-Cola', 'Boisson gazeuse 33cl', 3.50, 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13', 'Boissons', true, NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Eau minérale', 'Eau minérale naturelle 50cl', 2.50, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d', 'Boissons', true, NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Salade César', 'Salade, croûtons, parmesan, sauce césar', 9.90, 'https://images.unsplash.com/photo-1546793665-c74683f339c1', 'Entrées', true, NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Bruschetta', 'Pain grillé, tomates, basilic, huile d\'olive', 7.90, 'https://images.unsplash.com/photo-1572441713132-51c75654db73', 'Entrées', true, NOW())
ON CONFLICT DO NOTHING;

-- Créer des commandes de test
INSERT INTO orders (restaurant_id, customer_name, customer_phone, delivery_address, delivery_city, delivery_postal_code, total_amount, delivery_fee, status, items, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Marie Martin', '0987654321', '123 Rue de la Paix', 'Paris', '75001', 25.50, 3.50, 'ready', '[{"name": "Pizza Margherita", "quantity": 1, "price": 12.90}, {"name": "Tiramisu", "quantity": 1, "price": 6.90}, {"name": "Coca-Cola", "quantity": 1, "price": 3.50}]', NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Marie Martin', '0987654321', '456 Avenue des Champs', 'Paris', '75002', 18.90, 2.50, 'ready', '[{"name": "Pizza Quatre Fromages", "quantity": 1, "price": 15.90}, {"name": "Eau minérale", "quantity": 1, "price": 2.50}]', NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Marie Martin', '0987654321', '789 Boulevard Saint-Germain', 'Paris', '75003', 42.00, 4.00, 'pending', '[{"name": "Pizza Prosciutto", "quantity": 2, "price": 16.90}, {"name": "Salade César", "quantity": 1, "price": 9.90}]', NOW());

-- ============================================
-- 3. CRÉER LES INDEX ET TRIGGERS
-- ============================================

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_id ON orders(delivery_id);
CREATE INDEX IF NOT EXISTS idx_menus_restaurant_id ON menus(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menus_updated_at
    BEFORE UPDATE ON menus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ACTIVER RLS (Row Level Security)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Politiques RLS basiques
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Anyone can view restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can update their restaurant" ON restaurants FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Anyone can view menus" ON menus FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can manage their menus" ON menus FOR ALL USING (
  EXISTS (SELECT 1 FROM restaurants WHERE id = menus.restaurant_id AND user_id::text = auth.uid()::text)
);

CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Anyone can create orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Restaurant owners and delivery can update orders" ON orders FOR UPDATE USING (true);

CREATE POLICY "Anyone can view order items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create order items" ON order_items FOR INSERT WITH CHECK (true);

-- ============================================
-- FIN DU SCRIPT
-- ============================================

-- Message de confirmation
SELECT 'Données de test créées avec succès !' as message;
