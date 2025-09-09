-- Diagnostic des commandes du restaurant
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la commande #999 et son restaurant_id
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

-- 2. Vérifier tous les restaurants
SELECT 
  'Restaurants disponibles' as info,
  id,
  nom,
  adresse,
  user_id
FROM restaurants;

-- 3. Vérifier les commandes pour chaque restaurant
SELECT 
  'Commandes par restaurant' as info,
  r.id as restaurant_id,
  r.nom as restaurant_nom,
  COUNT(o.id) as nombre_commandes
FROM restaurants r
LEFT JOIN orders o ON r.id = o.restaurant_id
GROUP BY r.id, r.nom
ORDER BY nombre_commandes DESC;

-- 4. Vérifier les commandes du restaurant de la commande #999
SELECT 
  'Commandes du restaurant de #999' as info,
  o.id,
  o.customer_name,
  o.status,
  o.restaurant_id,
  r.nom as restaurant_nom
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
WHERE o.restaurant_id = (SELECT restaurant_id FROM orders WHERE id = 999);