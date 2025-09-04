-- Script final pour corriger l'accès du livreur
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'utilisateur actuel
SELECT '=== UTILISATEUR ACTUEL ===' as info;
SELECT id, email, role, nom, prenom, password FROM users WHERE email = 'livreur@cvneat.com';

-- 2. Forcer la mise à jour du rôle ET du mot de passe
UPDATE users 
SET role = 'delivery',
    password = 'livreur123',
    updated_at = NOW()
WHERE email = 'livreur@cvneat.com';

-- 3. Vérifier la mise à jour
SELECT '=== APRÈS MISE À JOUR ===' as info;
SELECT id, email, role, nom, prenom, password FROM users WHERE email = 'livreur@cvneat.com';

-- 4. Vérifier tous les livreurs
SELECT '=== TOUS LES LIVREURS ===' as info;
SELECT id, email, role, nom, prenom FROM users WHERE role = 'delivery';

-- 5. Vérifier les restaurants disponibles
SELECT '=== RESTAURANTS DISPONIBLES ===' as info;
SELECT id, nom, status FROM restaurants LIMIT 5;

-- 6. Créer des commandes de test avec un restaurant existant
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
-- Commande 1: Pizza Margherita
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
-- Commande 2: Menu complet
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
-- Commande 3: Commande simple
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
  'pending',
  '[{"id": "5", "name": "Pizza Pepperoni", "quantity": 1, "price": 12.00}]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 7. Vérifier les commandes créées
SELECT '=== COMMANDES CRÉÉES ===' as info;
SELECT id, customer_name, total_amount, status, created_at FROM orders ORDER BY created_at DESC;

-- 8. Résumé final
SELECT '=== RÉSUMÉ FINAL ===' as info;
SELECT 'Livreurs:' as type, COUNT(*) as count FROM users WHERE role = 'delivery'
UNION ALL
SELECT 'Commandes en attente:' as type, COUNT(*) as count FROM orders WHERE status = 'pending'
UNION ALL
SELECT 'Total commandes:' as type, COUNT(*) as count FROM orders;
