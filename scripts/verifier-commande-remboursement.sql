-- Script SQL pour vérifier les détails d'une commande et son remboursement
-- Usage: Exécuter dans Supabase SQL Editor avec l'ID de commande

-- Remplacer cet ID par l'ID de votre commande
-- 50b5862e-384b-40e4-a572-82325ede248b

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
WHERE id = '50b5862e-384b-40e4-a572-82325ede248b';

