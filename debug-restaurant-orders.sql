-- Script de débogage pour vérifier les commandes et restaurants
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

-- 2. Voir les commandes récentes avec leur restaurant_id
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

-- 3. Vérifier si le restaurant_id de la page restaurant existe
SELECT 
  id,
  nom,
  user_id
FROM restaurants 
WHERE id = '7f1e0b5f-5552-445d-a582-306515030c8d';

-- 4. Voir les commandes pour ce restaurant spécifique
SELECT 
  id,
  restaurant_id,
  customer_name,
  status,
  total_amount,
  created_at
FROM orders 
WHERE restaurant_id = '7f1e0b5f-5552-445d-a582-306515030c8d'
ORDER BY created_at DESC;
