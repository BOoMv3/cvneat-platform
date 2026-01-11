-- Script pour supprimer la commande #9a5865d6
-- Commande en attente, aucun livreur présent, client sera remboursé

DO $$
DECLARE
    v_commande_id UUID;
    v_commande_statut TEXT;
    v_details_count INT;
BEGIN
    -- Rechercher la commande par les 8 premiers caractères de l'UUID
    SELECT id, statut INTO v_commande_id, v_commande_statut
    FROM commandes
    WHERE id::text LIKE '9a5865d6%'
    LIMIT 1;
    
    IF v_commande_id IS NULL THEN
        RAISE EXCEPTION 'Commande #9a5865d6 non trouvée dans la base de données';
    END IF;
    
    RAISE NOTICE '✅ Commande trouvée: ID = %, Statut = %', v_commande_id, v_commande_statut;
    
    -- Vérifier que la commande est en attente
    IF v_commande_statut != 'en_attente' THEN
        RAISE WARNING '⚠️ Commande n''est pas en attente (statut: %), suppression quand même', v_commande_statut;
    END IF;
    
    -- Compter les détails avant suppression
    SELECT COUNT(*) INTO v_details_count FROM details_commande WHERE commande_id = v_commande_id;
    RAISE NOTICE 'Détails de commande à supprimer: %', v_details_count;
    
    -- Supprimer les notes de livraison associées (si elles existent)
    DELETE FROM delivery_ratings WHERE order_id = v_commande_id;
    RAISE NOTICE '✓ Notes de livraison supprimées (si présentes)';
    
    -- Supprimer les détails de commande
    DELETE FROM details_commande WHERE commande_id = v_commande_id;
    RAISE NOTICE '✓ Détails de commande supprimés (%)', v_details_count;
    
    -- Supprimer la commande
    DELETE FROM commandes WHERE id = v_commande_id;
    RAISE NOTICE '✓ Commande supprimée';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Commande #9a5865d6 supprimée avec succès';
    RAISE NOTICE '   ID complet: %', v_commande_id;
    RAISE NOTICE '   Statut: %', v_commande_statut;
    RAISE NOTICE '   Détails supprimés: %', v_details_count;
END $$;

