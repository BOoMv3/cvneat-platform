-- Vérifier les données existantes
-- À exécuter dans Supabase SQL Editor

-- 1. Voir tous les utilisateurs existants
SELECT 
  id,
  email,
  nom,
  prenom,
  role,
  created_at
FROM users 
ORDER BY created_at DESC;

-- 2. Voir tous les restaurants existants
SELECT 
  id,
  nom,
  adresse,
  telephone,
  email,
  is_active
FROM restaurants 
ORDER BY created_at DESC;

-- 3. Voir les commandes existantes
SELECT 
  id,
  customer_name,
  status,
  restaurant_id,
  total_amount,
  delivery_fee,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Voir les commandes avec leur restaurant
SELECT 
  o.id,
  o.customer_name,
  o.status,
  r.nom as restaurant_name,
  o.total_amount,
  o.delivery_fee
FROM orders o
LEFT JOIN restaurants r ON o.restaurant_id = r.id
ORDER BY o.created_at DESC 
LIMIT 5;
