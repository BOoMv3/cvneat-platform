-- Script SQL pour annuler toutes les commandes remboursées d'aujourd'hui
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier les commandes remboursées d'aujourd'hui qui ne sont pas encore annulées
SELECT
  id,
  statut,
  payment_status,
  total,
  frais_livraison,
  stripe_payment_intent_id,
  stripe_refund_id,
  refund_amount,
  refunded_at,
  created_at,
  updated_at
FROM commandes
WHERE 
  payment_status = 'refunded'
  AND DATE(created_at) = CURRENT_DATE
  AND statut != 'annulee'
ORDER BY created_at DESC;

-- 2. Annuler toutes les commandes remboursées d'aujourd'hui qui ne sont pas encore annulées
UPDATE commandes
SET
  statut = 'annulee',
  updated_at = NOW()
WHERE 
  payment_status = 'refunded'
  AND DATE(created_at) = CURRENT_DATE
  AND statut != 'annulee';

-- 3. Vérifier le résultat après mise à jour
SELECT
  id,
  statut,
  payment_status,
  total,
  frais_livraison,
  stripe_refund_id,
  refund_amount,
  refunded_at,
  created_at,
  updated_at
FROM commandes
WHERE 
  payment_status = 'refunded'
  AND DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

