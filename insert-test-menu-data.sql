-- Script pour insérer des données de test pour les menus
-- À exécuter dans Supabase SQL Editor

-- Vérifier d'abord s'il y a des restaurants
-- Si pas de restaurants, en créer un de test
INSERT INTO restaurants (id, nom, description, adresse, code_postal, ville, telephone, email, type_cuisine, status, created_at)
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
  'active',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insérer des plats de test pour le restaurant
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
