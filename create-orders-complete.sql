-- SCRIPT COMPLET POUR CRÉER DES COMMANDES DE TEST
-- 1. Vérifier la structure de la table orders
SELECT '=== STRUCTURE TABLE ORDERS ===' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- 2. Vérifier les restaurants disponibles
SELECT '=== RESTAURANTS DISPONIBLES ===' as info;
SELECT id, nom FROM restaurants LIMIT 5;

-- 3. Créer des commandes de test avec TOUTES les colonnes obligatoires
INSERT INTO orders (
  customer_name, 
  customer_phone, 
  delivery_address, 
  delivery_city, 
  delivery_postal_code, 
  items,
  total_amount, 
  status, 
  restaurant_id, 
  created_at, 
  updated_at
)
SELECT 
  'Client Test ' || generate_series(1, 3),
  '0123456789',
  'Adresse Test ' || generate_series(1, 3),
  'Paris',
  '75001',
  '[{"name": "Pizza Margherita", "quantity": 1, "price": 12.50}, {"name": "Coca Cola", "quantity": 1, "price": 3.00}]'::jsonb,
  25.50 + (random() * 20),
  'pending',
  (SELECT id FROM restaurants LIMIT 1),
  NOW() - (random() * interval '1 hour'),
  NOW()
ON CONFLICT DO NOTHING;

-- 4. Vérifier les commandes créées
SELECT '=== COMMANDES CRÉÉES ===' as info;
SELECT id, customer_name, status, total_amount, created_at 
FROM orders 
WHERE status IN ('pending', 'ready') 
ORDER BY created_at DESC;

-- 5. Vérifier le livreur
SELECT '=== LIVREUR ===' as info;
SELECT id, email, role FROM users WHERE email = 'livreur1@cvneat.com';
