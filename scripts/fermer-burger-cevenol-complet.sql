-- Script SQL COMPLET pour fermer le Burger Cévenol et annuler leur dernière commande
-- Version avec identification automatique de la dernière commande
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Identifier le restaurant et voir son état actuel
SELECT 
    id as restaurant_id,
    nom,
    email,
    telephone,
    ferme_manuellement,
    status
FROM restaurants
WHERE nom ILIKE '%cévenol%burger%'
   OR nom ILIKE '%cevenol%burger%'
   OR nom ILIKE '%cévenol burger%'
   OR nom ILIKE '%cevenol burger%'
   OR nom ILIKE '%burger%cevenol%'
   OR nom ILIKE '%burger%cévenol%';

-- ÉTAPE 2: Voir la dernière commande (avant modifications)
SELECT 
    c.id as commande_id,
    c.created_at,
    c.statut,
    c.payment_status,
    c.total,
    c.frais_livraison,
    c.stripe_payment_intent_id,
    c.user_id,
    u.email as client_email,
    (u.prenom || ' ' || u.nom) as client_nom_complet
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN users u ON c.user_id = u.id
WHERE (r.nom ILIKE '%cévenol%burger%'
   OR r.nom ILIKE '%cevenol%burger%'
   OR r.nom ILIKE '%cévenol burger%'
   OR r.nom ILIKE '%cevenol burger%'
   OR r.nom ILIKE '%burger%cevenol%'
   OR r.nom ILIKE '%burger%cévenol%')
  AND c.statut != 'annulee'
ORDER BY c.created_at DESC
LIMIT 1;

-- ÉTAPE 3: Fermer le restaurant (mettre ferme_manuellement = true)
UPDATE restaurants
SET 
    ferme_manuellement = true,
    updated_at = NOW()
WHERE nom ILIKE '%cévenol%burger%'
   OR nom ILIKE '%cevenol%burger%'
   OR nom ILIKE '%cévenol burger%'
   OR nom ILIKE '%cevenol burger%'
   OR nom ILIKE '%burger%cevenol%'
   OR nom ILIKE '%burger%cévenol%';

-- ÉTAPE 4: Annuler la dernière commande (mettre le statut à 'annulee')
-- NOTE IMPORTANTE: Pour le remboursement Stripe, vous devez utiliser l'API /api/admin/orders/cancel/[orderId]
-- ou le faire manuellement dans le dashboard Stripe avec le stripe_payment_intent_id
DO $$
DECLARE
    restaurant_id_found UUID;
    derniere_commande_id UUID;
    stripe_pi_id TEXT;
    montant_total DECIMAL(10,2);
    restaurant_nom TEXT;
BEGIN
    -- Trouver l'ID du restaurant "Le Cévenol Burger"
    SELECT id, nom INTO restaurant_id_found, restaurant_nom
    FROM restaurants
    WHERE nom ILIKE '%cévenol%burger%'
       OR nom ILIKE '%cevenol%burger%'
       OR nom ILIKE '%cévenol burger%'
       OR nom ILIKE '%cevenol burger%'
       OR nom ILIKE '%burger%cevenol%'
       OR nom ILIKE '%burger%cévenol%'
    ORDER BY 
      CASE 
        WHEN nom ILIKE '%cévenol%burger%' OR nom ILIKE '%cevenol%burger%' THEN 1
        WHEN nom ILIKE '%cévenol burger%' OR nom ILIKE '%cevenol burger%' THEN 2
        WHEN nom ILIKE '%burger%cevenol%' OR nom ILIKE '%burger%cévenol%' THEN 3
        ELSE 4
      END
    LIMIT 1;
    
    IF restaurant_id_found IS NULL THEN
        -- Afficher tous les restaurants pour aider à identifier
        RAISE NOTICE '⚠️ Restaurant Burger Cévenol non trouvé avec les critères de recherche.';
        RAISE NOTICE 'Restaurants contenant "burger" ou "cevenol":';
        FOR restaurant_nom IN 
            SELECT nom FROM restaurants 
            WHERE nom ILIKE '%burger%' OR nom ILIKE '%cevenol%' OR nom ILIKE '%cévenol%'
        LOOP
            RAISE NOTICE '  - %', restaurant_nom;
        END LOOP;
        RAISE EXCEPTION 'Restaurant Burger Cévenol non trouvé. Vérifiez le nom exact dans la liste ci-dessus.';
    END IF;
    
    RAISE NOTICE '✅ Restaurant trouvé: % (ID: %)', restaurant_nom, restaurant_id_found;
    
    -- Trouver la dernière commande non annulée
    SELECT 
        c.id,
        c.stripe_payment_intent_id,
        (c.total + c.frais_livraison) as total_avec_livraison
    INTO derniere_commande_id, stripe_pi_id, montant_total
    FROM commandes c
    WHERE c.restaurant_id = restaurant_id_found
      AND c.statut != 'annulee'
    ORDER BY c.created_at DESC
    LIMIT 1;
    
    IF derniere_commande_id IS NULL THEN
        RAISE NOTICE 'Aucune commande non annulée trouvée pour le Burger Cévenol';
        RETURN;
    END IF;
    
    -- Annuler la commande
    UPDATE commandes
    SET 
        statut = 'annulee',
        payment_status = 'refunded',
        updated_at = NOW()
    WHERE id = derniere_commande_id;
    
    RAISE NOTICE '✅ Commande % annulée (statut = annulee, payment_status = refunded)', derniere_commande_id;
    RAISE NOTICE '⚠️ IMPORTANT: Pour le remboursement Stripe, utilisez le Payment Intent ID: %', stripe_pi_id;
    RAISE NOTICE '⚠️ Montant à rembourser: %€', montant_total;
    RAISE NOTICE '⚠️ API à appeler: POST /api/admin/orders/cancel/%', derniere_commande_id;
    
END $$;

-- ÉTAPE 5: Vérifier le résultat final
SELECT 
    r.nom as restaurant,
    r.ferme_manuellement,
    c.id as commande_id,
    c.statut,
    c.payment_status,
    c.total,
    c.frais_livraison,
    c.stripe_payment_intent_id,
    c.created_at as date_commande,
    (u.prenom || ' ' || u.nom) as client,
    u.email as client_email
FROM restaurants r
LEFT JOIN commandes c ON c.restaurant_id = r.id
LEFT JOIN users u ON c.user_id = u.id
WHERE (r.nom ILIKE '%cévenol%burger%'
   OR r.nom ILIKE '%cevenol%burger%'
   OR r.nom ILIKE '%cévenol burger%'
   OR r.nom ILIKE '%cevenol burger%'
   OR r.nom ILIKE '%burger%cevenol%'
   OR r.nom ILIKE '%burger%cévenol%')
ORDER BY c.created_at DESC
LIMIT 3;

