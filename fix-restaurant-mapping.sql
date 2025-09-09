-- Corriger le mapping utilisateur-restaurant
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la commande #999 et son restaurant
SELECT 
  'Commande #999' as info,
  id,
  customer_name,
  status,
  restaurant_id
FROM orders 
WHERE id = 999;

-- 2. Vérifier le restaurant de la commande #999
SELECT 
  'Restaurant de la commande #999' as info,
  r.id,
  r.nom,
  r.user_id
FROM restaurants r
WHERE r.id = (SELECT restaurant_id FROM orders WHERE id = 999);

-- 3. Mettre à jour l'utilisateur admin2@cvneat.com pour qu'il soit associé au bon restaurant
UPDATE restaurants 
SET user_id = '5608b85f-4316-46f1-99f2-a85be0b35581' -- ID de admin2@cvneat.com
WHERE id = '7f1e0b5f-5552-445d-a582-306515030c8d'; -- ID du restaurant "La Bonne Pate"

-- 4. Vérifier que la mise à jour a fonctionné
SELECT 
  'Mapping corrigé' as info,
  u.id as user_id,
  u.email,
  u.nom,
  u.prenom,
  r.id as restaurant_id,
  r.nom as restaurant_nom
FROM users u
LEFT JOIN restaurants r ON u.id = r.user_id
WHERE u.email = 'admin2@cvneat.com';

-- 5. Vérifier que la commande #999 est maintenant visible pour cet utilisateur
SELECT 
  'Commandes visibles pour admin2@cvneat.com' as info,
  o.id,
  o.customer_name,
  o.status,
  o.restaurant_id
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE r.user_id = '5608b85f-4316-46f1-99f2-a85be0b35581'
ORDER BY o.created_at DESC;
