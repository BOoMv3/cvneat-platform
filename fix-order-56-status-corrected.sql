-- Script corrigé pour la commande #56
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'état actuel de la commande #56
SELECT 
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  total_amount,
  created_at,
  updated_at
FROM orders 
WHERE id = 56;

-- 2. Si la commande a un delivery_id, elle devrait être en statut "ready" (prête)
-- Pas "preparing" car elle était déjà prête
UPDATE orders 
SET 
  status = 'ready',
  updated_at = NOW()
WHERE id = 56 
  AND delivery_id IS NOT NULL;

-- 3. Vérifier le résultat
SELECT 
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  total_amount,
  updated_at
FROM orders 
WHERE id = 56;
