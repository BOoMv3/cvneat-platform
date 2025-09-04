-- Script pour corriger SEULEMENT le rôle du livreur existant
-- À exécuter dans Supabase SQL Editor

-- Vérifier l'utilisateur existant
SELECT 'Utilisateur livreur actuel:' as info;
SELECT id, email, role, nom, prenom FROM users WHERE email = 'livreur@cvneat.com';

-- Mettre à jour SEULEMENT le rôle
UPDATE users 
SET role = 'delivery',
    updated_at = NOW()
WHERE email = 'livreur@cvneat.com';

-- Vérifier que la mise à jour a fonctionné
SELECT 'Utilisateur livreur après mise à jour:' as info;
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
