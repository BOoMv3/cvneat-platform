-- Diagnostic de la correspondance utilisateur-restaurant
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la commande #999
SELECT 
  'Commande #999' as info,
  id,
  customer_name,
  status,
  restaurant_id,
  delivery_id,
  created_at,
  updated_at
FROM orders 
WHERE id = 999;

-- 2. Vérifier le restaurant de la commande #999
SELECT 
  'Restaurant de la commande #999' as info,
  r.id,
  r.nom,
  r.adresse,
  r.user_id
FROM restaurants r
WHERE r.id = (SELECT restaurant_id FROM orders WHERE id = 999);

-- 3. Vérifier l'utilisateur de ce restaurant
SELECT 
  'Utilisateur du restaurant' as info,
  u.id,
  u.email,
  u.nom,
  u.prenom,
  u.role
FROM users u
WHERE u.id = (
  SELECT r.user_id 
  FROM restaurants r 
  WHERE r.id = (SELECT restaurant_id FROM orders WHERE id = 999)
);

-- 4. Vérifier toutes les commandes de ce restaurant
SELECT 
  'Toutes les commandes du restaurant' as info,
  o.id,
  o.customer_name,
  o.status,
  o.restaurant_id,
  o.created_at
FROM orders o
WHERE o.restaurant_id = (SELECT restaurant_id FROM orders WHERE id = 999)
ORDER BY o.created_at DESC;

-- 5. Vérifier les utilisateurs restaurant et leurs restaurants
SELECT 
  'Mapping utilisateur-restaurant' as info,
  u.id as user_id,
  u.email,
  u.nom,
  u.prenom,
  r.id as restaurant_id,
  r.nom as restaurant_nom
FROM users u
LEFT JOIN restaurants r ON u.id = r.user_id
WHERE u.role = 'restaurant';
