-- Trouver le bon restaurant_id pour les commandes récentes
-- À exécuter dans Supabase SQL Editor

-- 1. Voir les 3 dernières commandes avec leur restaurant_id
SELECT 
  id,
  restaurant_id,
  customer_name,
  status,
  total_amount,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 3;

-- 2. Voir tous les restaurants disponibles
SELECT 
  id,
  nom,
  user_id,
  adresse
FROM restaurants 
ORDER BY created_at DESC;

-- 3. Vérifier si le restaurant_id de la page existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM restaurants WHERE id = '7f1e0b5f-5552-445d-a582-306515030c8d') 
    THEN 'EXISTE' 
    ELSE 'N''EXISTE PAS' 
  END as restaurant_exists;
