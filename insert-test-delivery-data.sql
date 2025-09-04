-- Script pour insérer des données de test pour le système de livraison
-- À exécuter dans Supabase SQL Editor

-- 0. Créer la table orders si elle n'existe pas (structure existante)
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
    delivery_time INTEGER, -- en minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table order_items si elle n'existe pas (structure compatible)
CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Créer un livreur de test
INSERT INTO users (id, nom, prenom, email, telephone, adresse, code_postal, ville, role, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Dupont',
  'Jean',
  'livreur@cvneat.fr',
  '0123456789',
  '123 Rue des Livreurs',
  '75001',
  'Paris',
  'delivery',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Créer un client de test
INSERT INTO users (id, nom, prenom, email, telephone, adresse, code_postal, ville, role, created_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Martin',
  'Marie',
  'client@cvneat.fr',
  '0987654321',
  '456 Avenue des Clients',
  '75002',
  'Paris',
  'user',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Créer des commandes de test
INSERT INTO orders (restaurant_id, customer_name, customer_phone, delivery_address, delivery_city, delivery_postal_code, total_amount, delivery_fee, status, items, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Marie Martin', '0987654321', '123 Rue de la Paix', 'Paris', '75001', 25.50, 3.50, 'ready', '[{"name": "Pizza Margherita", "quantity": 1, "price": 12.90}, {"name": "Tiramisu", "quantity": 1, "price": 6.90}, {"name": "Coca-Cola", "quantity": 1, "price": 3.50}]', NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Marie Martin', '0987654321', '456 Avenue des Champs', 'Paris', '75002', 18.90, 2.50, 'ready', '[{"name": "Pizza Quatre Fromages", "quantity": 1, "price": 15.90}, {"name": "Eau minérale", "quantity": 1, "price": 2.50}]', NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Marie Martin', '0987654321', '789 Boulevard Saint-Germain', 'Paris', '75003', 42.00, 4.00, 'pending', '[{"name": "Pizza Prosciutto", "quantity": 2, "price": 16.90}, {"name": "Salade César", "quantity": 1, "price": 9.90}]', NOW());

-- 4. Créer des articles de commande de test (optionnel, car les items sont déjà dans le JSONB)
INSERT INTO order_items (order_id, menu_id, quantity, price, created_at)
VALUES 
  ((SELECT id FROM orders WHERE customer_name = 'Marie Martin' AND delivery_address = '123 Rue de la Paix' LIMIT 1), (SELECT id FROM menus WHERE nom = 'Pizza Margherita' LIMIT 1), 1, 12.90, NOW()),
  ((SELECT id FROM orders WHERE customer_name = 'Marie Martin' AND delivery_address = '123 Rue de la Paix' LIMIT 1), (SELECT id FROM menus WHERE nom = 'Tiramisu' LIMIT 1), 1, 6.90, NOW()),
  ((SELECT id FROM orders WHERE customer_name = 'Marie Martin' AND delivery_address = '123 Rue de la Paix' LIMIT 1), (SELECT id FROM menus WHERE nom = 'Coca-Cola' LIMIT 1), 1, 3.50, NOW()),
  ((SELECT id FROM orders WHERE customer_name = 'Marie Martin' AND delivery_address = '456 Avenue des Champs' LIMIT 1), (SELECT id FROM menus WHERE nom = 'Pizza Quatre Fromages' LIMIT 1), 1, 15.90, NOW()),
  ((SELECT id FROM orders WHERE customer_name = 'Marie Martin' AND delivery_address = '456 Avenue des Champs' LIMIT 1), (SELECT id FROM menus WHERE nom = 'Eau minérale' LIMIT 1), 1, 2.50, NOW());
