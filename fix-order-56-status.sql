-- Script pour corriger le statut de la commande #56
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier l'état actuel de la commande #56
SELECT 
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  created_at,
  updated_at
FROM orders 
WHERE id = 56;

-- 2. Si la commande a un delivery_id, elle devrait être en statut "preparing" ou "ready"
-- Pas "accepted" car c'est le statut avant acceptation par le livreur
UPDATE orders 
SET 
  status = 'preparing',
  updated_at = NOW()
WHERE id = 56 
  AND delivery_id IS NOT NULL 
  AND status = 'accepted';

-- 3. Vérifier le résultat
SELECT 
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  updated_at
FROM orders 
WHERE id = 56;
