-- Corriger le statut de la commande #1000
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'état actuel de la commande #1000
SELECT 
  'État actuel de la commande #1000' as info,
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  created_at,
  updated_at
FROM orders 
WHERE id = 1000;

-- 2. Corriger la commande #1000 pour qu'elle soit disponible pour les livreurs
UPDATE orders 
SET 
  status = 'accepted', -- Statut "acceptée" par le restaurant, pas par le livreur
  delivery_id = NULL,  -- Pas encore acceptée par un livreur
  updated_at = NOW()
WHERE id = 1000;

-- 3. Vérifier que la correction a fonctionné
SELECT 
  'Commande #1000 corrigée' as info,
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  created_at,
  updated_at
FROM orders 
WHERE id = 1000;

-- 4. Vérifier les commandes disponibles pour les livreurs
SELECT 
  'Commandes disponibles pour les livreurs' as info,
  id,
  customer_name,
  status,
  delivery_id,
  total_amount,
  created_at
FROM orders 
WHERE status = 'accepted' 
  AND delivery_id IS NULL
ORDER BY created_at DESC;
