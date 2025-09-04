-- Vérifier les commandes les plus récentes
-- À exécuter dans Supabase SQL Editor

-- 1. Voir les 5 dernières commandes créées
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

-- 2. Voir tous les restaurants disponibles
SELECT 
  id,
  nom,
  user_id,
  adresse
FROM restaurants 
ORDER BY created_at DESC;
