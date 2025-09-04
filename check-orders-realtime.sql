-- Vérifier les commandes en temps réel
-- À exécuter dans Supabase SQL Editor

-- 1. Voir TOUTES les commandes récentes (tous statuts)
SELECT 
  id,
  restaurant_id,
  customer_name,
  status,
  total_amount,
  created_at,
  updated_at
FROM orders 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 2. Voir les commandes pour le restaurant spécifique (tous statuts)
SELECT 
  id,
  restaurant_id,
  customer_name,
  status,
  total_amount,
  created_at,
  updated_at
FROM orders 
WHERE restaurant_id = '7f1e0b5f-5552-445d-a582-306515030c8d'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 3. Voir l'historique des changements de statut
SELECT 
  id,
  customer_name,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_since_creation
FROM orders 
WHERE restaurant_id = '7f1e0b5f-5552-445d-a582-306515030c8d'
ORDER BY created_at DESC
LIMIT 10;
