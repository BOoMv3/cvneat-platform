-- Diagnostic complet de toutes les commandes
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier toutes les commandes existantes
SELECT 
  'Toutes les commandes' as info,
  id,
  customer_name,
  status,
  preparation_time,
  total_amount,
  delivery_id,
  restaurant_id,
  created_at,
  updated_at
FROM orders 
ORDER BY created_at DESC;

-- 2. Vérifier spécifiquement la commande #999
SELECT 
  'Commande #999' as info,
  id,
  customer_name,
  status,
  preparation_time,
  total_amount,
  delivery_id,
  restaurant_id,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed
FROM orders 
WHERE id = 999;

-- 3. Vérifier les restaurants
SELECT 
  'Restaurants' as info,
  id,
  nom,
  adresse,
  user_id
FROM restaurants;

-- 4. Vérifier les utilisateurs avec rôle restaurant
SELECT 
  'Utilisateurs restaurant' as info,
  id,
  email,
  nom,
  prenom,
  role
FROM users 
WHERE role = 'restaurant';
