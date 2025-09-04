-- Vérifier les restaurants et les commandes
-- À exécuter dans Supabase SQL Editor

-- 1. Voir tous les restaurants
SELECT 
  id,
  nom,
  user_id,
  adresse,
  created_at
FROM restaurants 
ORDER BY created_at DESC;

-- 2. Voir les commandes récentes
SELECT 
  id,
  restaurant_id,
  customer_name,
  status,
  total_amount,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Voir les utilisateurs avec rôle restaurant
SELECT 
  id,
  email,
  role,
  created_at
FROM users 
WHERE role = 'restaurant'
ORDER BY created_at DESC;
