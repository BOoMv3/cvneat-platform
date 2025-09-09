-- Diagnostic de l'utilisateur connecté et de son restaurant
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'utilisateur restaurant@cvneat.com
SELECT 
  'Utilisateur connecté' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE email = 'restaurant@cvneat.com';

-- 2. Vérifier le restaurant de cet utilisateur
SELECT 
  'Restaurant de restaurant@cvneat.com' as info,
  r.id,
  r.nom,
  r.adresse,
  r.user_id
FROM restaurants r
WHERE r.user_id = (
  SELECT id FROM users WHERE email = 'restaurant@cvneat.com'
);

-- 3. Vérifier la commande #999 et son restaurant
SELECT 
  'Commande #999' as info,
  id,
  customer_name,
  status,
  restaurant_id
FROM orders 
WHERE id = 999;

-- 4. Vérifier le restaurant de la commande #999
SELECT 
  'Restaurant de la commande #999' as info,
  r.id,
  r.nom,
  r.adresse,
  r.user_id
FROM restaurants r
WHERE r.id = (SELECT restaurant_id FROM orders WHERE id = 999);

-- 5. Vérifier les commandes du restaurant de restaurant@cvneat.com
SELECT 
  'Commandes du restaurant de restaurant@cvneat.com' as info,
  o.id,
  o.customer_name,
  o.status,
  o.restaurant_id
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE r.user_id = (SELECT id FROM users WHERE email = 'restaurant@cvneat.com')
ORDER BY o.created_at DESC;
