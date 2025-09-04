-- Script pour créer l'utilisateur livreur dans la table users
-- À exécuter dans Supabase SQL Editor

-- Vérifier d'abord l'utilisateur existant
SELECT 'Utilisateurs avec email livreur:' as info;
SELECT id, email, role, nom, prenom FROM users WHERE email LIKE '%livreur%';

-- Créer l'utilisateur livreur avec l'ID exact de Supabase Auth
INSERT INTO users (
  id, 
  nom, 
  prenom, 
  email, 
  password, 
  telephone, 
  adresse, 
  code_postal, 
  ville, 
  role, 
  created_at,
  updated_at
) VALUES (
  '23dfb647-33c5-4809-bf62-a98931a4f4df',  -- ID exact de Supabase Auth
  'Dupont',
  'Jean',
  'livreur@cvneat.com',  -- Email exact de Supabase Auth
  'password123',
  '0123456789',
  '123 Rue des Livreurs',
  '75001',
  'Paris',
  'delivery',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'delivery',
  nom = 'Dupont',
  prenom = 'Jean',
  email = 'livreur@cvneat.com',
  telephone = '0123456789',
  adresse = '123 Rue des Livreurs',
  code_postal = '75001',
  ville = 'Paris',
  updated_at = NOW();

-- Vérifier que l'utilisateur a été créé/mis à jour
SELECT 'Utilisateur livreur après création:' as info;
SELECT id, email, role, nom, prenom FROM users WHERE email = 'livreur@cvneat.com';

-- Vérifier les commandes disponibles
SELECT 'Commandes disponibles:' as info;
SELECT id, status, delivery_id, customer_name, total_amount, created_at 
FROM orders 
WHERE status = 'ready' AND delivery_id IS NULL;

-- Si aucune commande, en créer une de test
INSERT INTO orders (
  user_id,
  restaurant_id,
  customer_name,
  customer_phone,
  delivery_address,
  delivery_city,
  delivery_postal_code,
  delivery_instructions,
  total_amount,
  delivery_fee,
  status,
  items,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM users WHERE email = 'client@cvneat.fr' LIMIT 1),
  '11111111-1111-1111-1111-111111111111',
  'Client Test',
  '0123456789',
  '123 Rue du Test',
  'Paris',
  '75001',
  'Sonner fort',
  25.50,
  2.50,
  'ready',
  '[{"id": "1", "name": "Pizza Margherita", "quantity": 1, "price": 12.50}, {"id": "2", "name": "Coca Cola", "quantity": 2, "price": 3.00}]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Vérification finale
SELECT 'Résumé final:' as info;
SELECT 'Livreurs:' as type, COUNT(*) as count FROM users WHERE role = 'delivery'
UNION ALL
SELECT 'Commandes prêtes:' as type, COUNT(*) as count FROM orders WHERE status = 'ready' AND delivery_id IS NULL;
