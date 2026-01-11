-- Script pour supprimer la commande #9a5865d6
-- Commande en attente, aucun livreur présent, client sera remboursé

DO $$
DECLARE
    commande_id UUID;
    commande_statut TEXT;
    details_count INT;
BEGIN
    -- Rechercher la commande par les 8 premiers caractères de l'UUID
    SELECT id, statut INTO commande_id, commande_statut
    FROM commandes
    WHERE id::text LIKE '9a5865d6%'
    LIMIT 1;
    
    IF commande_id IS NULL THEN
        RAISE EXCEPTION 'Commande #9a5865d6 non trouvée dans la base de données';
    END IF;
    
    RAISE NOTICE '✅ Commande trouvée: ID = %, Statut = %', commande_id, commande_statut;
    
    -- Vérifier que la commande est en attente
    IF commande_statut != 'en_attente' THEN
        RAISE WARNING '⚠️ Commande n''est pas en attente (statut: %), suppression quand même', commande_statut;
    END IF;
    
    -- Compter les détails avant suppression
    SELECT COUNT(*) INTO details_count FROM details_commande WHERE commande_id = commande_id;
    RAISE NOTICE 'Détails de commande à supprimer: %', details_count;
    
    -- Supprimer les notes de livraison associées (si elles existent)
    DELETE FROM delivery_ratings WHERE order_id = commande_id;
    RAISE NOTICE '✓ Notes de livraison supprimées (si présentes)';
    
    -- Supprimer les détails de commande
    DELETE FROM details_commande WHERE commande_id = commande_id;
    RAISE NOTICE '✓ Détails de commande supprimés (%)', details_count;
    
    -- Supprimer la commande
    DELETE FROM commandes WHERE id = commande_id;
    RAISE NOTICE '✓ Commande supprimée';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Commande #9a5865d6 supprimée avec succès';
    RAISE NOTICE '   ID complet: %', commande_id;
    RAISE NOTICE '   Statut: %', commande_statut;
    RAISE NOTICE '   Détails supprimés: %', details_count;
END $$;

