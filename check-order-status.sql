-- Script SQL pour vérifier l'état réel d'une commande spécifique
-- Remplacez 'AD721A7E-CF34-4C56-8F4B-AD00F483A89D' par l'ID de la commande que vous voulez vérifier

-- Vérifier le statut d'une commande spécifique
SELECT 
    id,
    statut,
    ready_for_delivery,
    user_id,
    restaurant_id,
    livreur_id,
    total,
    created_at,
    updated_at
FROM commandes
WHERE id = 'ad721a7e-cf34-4c56-8f4b-ad00f483a89d'  -- Remplacez par l'ID réel
OR id::text LIKE 'ad721a7e%';  -- Ou utilisez un pattern si vous avez seulement le début

-- Vérifier les dernières commandes créées et leurs statuts
SELECT 
    id,
    statut,
    ready_for_delivery,
    created_at,
    updated_at,
    CASE 
        WHEN statut = 'annulee' AND updated_at > created_at THEN '⚠️ Annulée après création'
        WHEN statut = 'en_preparation' THEN '✅ En préparation'
        WHEN statut = 'en_attente' THEN '⏳ En attente'
        ELSE '❓ Autre statut'
    END as etat
FROM commandes
WHERE restaurant_id = (SELECT id FROM restaurants WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com' LIMIT 1) LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;

-- Vérifier s'il y a des commandes qui ont été modifiées récemment mais sont toujours annulées
SELECT 
    id,
    statut,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_between
FROM commandes
WHERE statut = 'annulee'
AND updated_at > created_at + INTERVAL '1 second'
AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

