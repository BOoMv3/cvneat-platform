-- Script simple pour résoudre l'accès refusé
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'utilisateur actuel
SELECT '=== UTILISATEUR ACTUEL ===' as info;
SELECT id, email, role, nom, prenom FROM users WHERE email = 'livreur@cvneat.com';

-- 2. Forcer la mise à jour du rôle
UPDATE users 
SET role = 'delivery',
    updated_at = NOW()
WHERE email = 'livreur@cvneat.com';

-- 3. Vérifier la mise à jour
SELECT '=== APRÈS MISE À JOUR ===' as info;
SELECT id, email, role, nom, prenom FROM users WHERE email = 'livreur@cvneat.com';

-- 4. Vérifier tous les livreurs
SELECT '=== TOUS LES LIVREURS ===' as info;
SELECT id, email, role, nom, prenom FROM users WHERE role = 'delivery';

-- 5. Créer une commande de test si nécessaire
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
  '[{"id": "1", "name": "Pizza Margherita", "quantity": 1, "price": 12.50}]'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- 6. Résumé final
SELECT '=== RÉSUMÉ FINAL ===' as info;
SELECT 'Livreurs:' as type, COUNT(*) as count FROM users WHERE role = 'delivery'
UNION ALL
SELECT 'Commandes:' as type, COUNT(*) as count FROM orders;
