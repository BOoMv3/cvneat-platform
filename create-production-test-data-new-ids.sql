-- Créer des commandes de test en production (avec de nouveaux IDs)
-- Exécuter ce script dans Supabase (onglet SQL Editor)

-- Commande #7001 - Alerte préventive (15 min de préparation)
INSERT INTO orders (
  id, restaurant_id, customer_name, customer_phone, delivery_address, 
  delivery_city, delivery_postal_code, delivery_instructions, total_amount, 
  delivery_fee, status, delivery_id, preparation_time, items, created_at, 
  updated_at, security_code
) VALUES (
  7001, 
  '7f1e0b5f-5552-445d-a582-306515030c8d',
  'Client Test Alerte Préventive', 
  '0123456789', 
  '123 Rue de Test Alerte Préventive',
  'Paris',
  '75001',
  'Sonner à la porte',
  25.00, 
  4.00, 
  'preparing', 
  NULL, 
  15, 
  '[{"name": "Pizza Test", "price": 25.00, "quantity": 1}]', 
  NOW(), 
  NOW(), 
  '123456'
);

-- Commande #7002 - Alerte urgente (5 min de préparation)
INSERT INTO orders (
  id, restaurant_id, customer_name, customer_phone, delivery_address, 
  delivery_city, delivery_postal_code, delivery_instructions, total_amount, 
  delivery_fee, status, delivery_id, preparation_time, items, created_at, 
  updated_at, security_code
) VALUES (
  7002, 
  '7f1e0b5f-5552-445d-a582-306515030c8d',
  'Client Test Alerte Urgente', 
  '0123456789', 
  '456 Rue de Test Alerte Urgente',
  'Paris',
  '75001',
  'Appeler avant de livrer',
  18.00, 
  3.50, 
  'preparing', 
  NULL, 
  5, 
  '[{"name": "Burger Test", "price": 18.00, "quantity": 1}]', 
  NOW(), 
  NOW(), 
  '789012'
);

-- Vérifier que les commandes ont été créées
SELECT 
  id, 
  customer_name, 
  status, 
  preparation_time, 
  delivery_id, 
  security_code,
  created_at,
  updated_at
FROM orders 
WHERE id IN (7001, 7002)
ORDER BY id;
