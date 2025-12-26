-- Script SQL pour annuler la commande d'All'ovale pizza
-- ID de commande: 50b5862e-384b-40e4-a572-82325ede248b
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Vérifier la commande avant annulation
SELECT 
    c.id,
    c.created_at,
    c.statut,
    c.payment_status,
    c.total,
    c.frais_livraison,
    c.stripe_payment_intent_id,
    r.nom as restaurant,
    u.email as client_email,
    (u.prenom || ' ' || u.nom) as client_nom
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN users u ON c.user_id = u.id
WHERE c.id = '50b5862e-384b-40e4-a572-82325ede248b';

-- ÉTAPE 2: Annuler la commande dans la base de données
-- NOTE IMPORTANTE: Pour le remboursement Stripe, utilisez l'API /api/admin/orders/cancel/50b5862e-384b-40e4-a572-82325ede248b
-- ou le script Node.js scripts/cancel-order.js
UPDATE commandes
SET 
    statut = 'annulee',
    payment_status = 'refunded',
    updated_at = NOW()
WHERE id = '50b5862e-384b-40e4-a572-82325ede248b'
  AND statut != 'annulee';

-- ÉTAPE 3: Vérifier le résultat
SELECT 
    c.id,
    c.statut,
    c.payment_status,
    c.total,
    c.frais_livraison,
    c.stripe_payment_intent_id,
    c.updated_at,
    r.nom as restaurant
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.id = '50b5862e-384b-40e4-a572-82325ede248b';

