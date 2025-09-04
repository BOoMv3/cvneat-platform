-- Script complet de debug pour les commandes
-- À exécuter dans Supabase SQL Editor

-- 1. Voir les 5 dernières commandes avec leur restaurant_id
SELECT 
  id,
  restaurant_id,
  customer_name,
  status,
  total_amount,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Voir tous les restaurants
SELECT 
  id,
  nom,
  user_id,
  adresse
FROM restaurants 
ORDER BY created_at DESC;

-- 3. Vérifier les commandes pour le restaurant de la page
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

-- 4. Compter les commandes par statut
SELECT 
  status,
  COUNT(*) as count
FROM orders 
GROUP BY status
ORDER BY count DESC;
