-- Créer des commandes de test pour le livreur
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer toutes les anciennes commandes de test
DELETE FROM orders WHERE customer_name IN ('Marie Dupont', 'Jean Martin', 'Sophie Leroy', 'Pierre Durand', 'Test Commande');

-- 2. Vérifier qu'il y a des restaurants
SELECT '=== RESTAURANTS DISPONIBLES ===' as info;
SELECT id, nom, status FROM restaurants LIMIT 3;

-- 3. Créer des commandes de test
INSERT INTO orders (
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
) VALUES 
-- Commande 1: Pizza Margherita (PENDING)
(
  (SELECT id FROM restaurants LIMIT 1),
  'Marie Dupont',
  '0123456789',
  '15 Rue de la Paix, Paris',
  'Paris',
  '75001',
  'Sonner fort, 2ème étage',
  18.50,
  2.50,
  'pending',
  '[{"id": "1", "name": "Pizza Margherita", "quantity": 1, "price": 16.00}]'::jsonb,
  NOW(),
  NOW()
),
-- Commande 2: Menu complet (PENDING)
(
  (SELECT id FROM restaurants LIMIT 1),
  'Jean Martin',
  '0987654321',
  '42 Avenue des Champs, Paris',
  'Paris',
  '75008',
  'Porte à gauche',
  32.00,
  3.00,
  'pending',
  '[{"id": "2", "name": "Pizza 4 Fromages", "quantity": 1, "price": 18.00}, {"id": "3", "name": "Coca Cola", "quantity": 2, "price": 3.00}, {"id": "4", "name": "Tiramisu", "quantity": 1, "price": 8.00}]'::jsonb,
  NOW(),
  NOW()
),
-- Commande 3: Commande simple (READY)
(
  (SELECT id FROM restaurants LIMIT 1),
  'Sophie Leroy',
  '0555123456',
  '8 Rue du Commerce, Paris',
  'Paris',
  '75002',
  'Interphone 12B',
  14.00,
  2.00,
  'ready',
  '[{"id": "5", "name": "Pizza Pepperoni", "quantity": 1, "price": 12.00}]'::jsonb,
  NOW(),
  NOW()
),
-- Commande 4: Commande prête (READY)
(
  (SELECT id FROM restaurants LIMIT 1),
  'Pierre Durand',
  '0666123456',
  '25 Boulevard Saint-Germain, Paris',
  'Paris',
  '75005',
  'Porte cochère',
  22.00,
  3.00,
  'ready',
  '[{"id": "6", "name": "Pizza Quatre Saisons", "quantity": 1, "price": 19.00}]'::jsonb,
  NOW(),
  NOW()
),
-- Commande 5: Test simple (PENDING)
(
  (SELECT id FROM restaurants LIMIT 1),
  'Test Commande',
  '0123456789',
  '123 Rue Test, Paris',
  'Paris',
  '75001',
  'Test instructions',
  15.00,
  2.50,
  'pending',
  '[{"id": "7", "name": "Test Pizza", "quantity": 1, "price": 12.50}]'::jsonb,
  NOW(),
  NOW()
);

-- 4. Vérifier les commandes créées
SELECT '=== COMMANDES CRÉÉES ===' as info;
SELECT id, customer_name, status, total_amount, delivery_id, created_at FROM orders ORDER BY created_at DESC;

-- 5. Vérifier les commandes disponibles pour livreur
SELECT '=== COMMANDES DISPONIBLES POUR LIVREUR ===' as info;
SELECT id, customer_name, status, total_amount, created_at 
FROM orders 
WHERE status IN ('pending', 'ready') 
AND delivery_id IS NULL 
ORDER BY created_at DESC;

-- 6. Résumé final
SELECT '=== RÉSUMÉ FINAL ===' as info;
SELECT 'Total commandes:' as type, COUNT(*) as count FROM orders
UNION ALL
SELECT 'Commandes pending:' as type, COUNT(*) as count FROM orders WHERE status = 'pending'
UNION ALL
SELECT 'Commandes ready:' as type, COUNT(*) as count FROM orders WHERE status = 'ready'
UNION ALL
SELECT 'Commandes disponibles livreur:' as type, COUNT(*) as count FROM orders WHERE status IN ('pending', 'ready') AND delivery_id IS NULL;
