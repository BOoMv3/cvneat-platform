-- Créer des commandes de test pour le livreur
-- D'abord, vérifier les restaurants disponibles
SELECT '=== RESTAURANTS DISPONIBLES ===' as info;
SELECT id, nom FROM restaurants LIMIT 5;

-- Créer des commandes de test
INSERT INTO orders (customer_name, customer_phone, delivery_address, delivery_city, delivery_postal_code, total_amount, status, restaurant_id, created_at, updated_at)
SELECT 
  'Client Test ' || generate_series(1, 3),
  '0123456789',
  'Adresse Test ' || generate_series(1, 3),
  'Paris',
  '75001',
  25.50 + (random() * 20),
  'pending',
  (SELECT id FROM restaurants LIMIT 1),
  NOW() - (random() * interval '1 hour'),
  NOW()
ON CONFLICT DO NOTHING;

-- Vérifier les commandes créées
SELECT '=== COMMANDES CRÉÉES ===' as info;
SELECT id, customer_name, status, total_amount, created_at 
FROM orders 
WHERE status IN ('pending', 'ready') 
ORDER BY created_at DESC;

-- Vérifier le livreur
SELECT '=== LIVREUR ===' as info;
SELECT id, email, role FROM users WHERE email = 'livreur1@cvneat.com';
