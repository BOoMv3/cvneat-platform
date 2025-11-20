-- Script FORCÉ pour mettre à jour TOUS les menus avec TOUTES les boissons
-- À exécuter dans Supabase SQL Editor
-- Ce script va FORCER la mise à jour même si certaines boissons n'existent pas encore

DO $$
DECLARE
    restaurant_id_var UUID;
    pepsi_id UUID;
    orangina_id UUID;
    ice_tea_id UUID;
    perrier_id UUID;
    eau_id UUID;
    all_drink_ids UUID[];
    menus_updated INTEGER;
BEGIN
    -- 1. Trouver le restaurant
    SELECT id INTO restaurant_id_var
    FROM restaurants
    WHERE LOWER(nom) LIKE '%99%street%food%'
       OR LOWER(nom) LIKE '%street%food%'
       OR LOWER(nom) = '99 street food'
    LIMIT 1;

    IF restaurant_id_var IS NULL THEN
        RAISE EXCEPTION 'Restaurant 99 street food non trouvé';
    END IF;

    RAISE NOTICE '✅ Restaurant trouvé: %', restaurant_id_var;

    -- 2. S'assurer que TOUTES les boissons existent (créer si nécessaire)
    
    -- Pepsi
    SELECT id INTO pepsi_id FROM menus 
    WHERE restaurant_id = restaurant_id_var 
    AND LOWER(nom) = 'pepsi' 
    AND is_drink = true 
    LIMIT 1;
    
    IF pepsi_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Pepsi', 'Boisson gazeuse Pepsi', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO pepsi_id;
        RAISE NOTICE '✅ Pepsi créé: %', pepsi_id;
    ELSE
        RAISE NOTICE '✅ Pepsi existe: %', pepsi_id;
    END IF;

    -- Orangina
    SELECT id INTO orangina_id FROM menus 
    WHERE restaurant_id = restaurant_id_var 
    AND LOWER(nom) = 'orangina' 
    AND is_drink = true 
    LIMIT 1;
    
    IF orangina_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Orangina', 'Boisson gazeuse aux agrumes', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO orangina_id;
        RAISE NOTICE '✅ Orangina créé: %', orangina_id;
    ELSE
        RAISE NOTICE '✅ Orangina existe: %', orangina_id;
    END IF;

    -- Ice Tea
    SELECT id INTO ice_tea_id FROM menus 
    WHERE restaurant_id = restaurant_id_var 
    AND (LOWER(nom) LIKE '%ice%tea%' OR LOWER(nom) LIKE '%icetea%' OR LOWER(nom) = 'ice tea')
    AND is_drink = true 
    LIMIT 1;
    
    IF ice_tea_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Ice Tea', 'Thé glacé', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO ice_tea_id;
        RAISE NOTICE '✅ Ice Tea créé: %', ice_tea_id;
    ELSE
        RAISE NOTICE '✅ Ice Tea existe: %', ice_tea_id;
    END IF;

    -- Perrier
    SELECT id INTO perrier_id FROM menus 
    WHERE restaurant_id = restaurant_id_var 
    AND LOWER(nom) = 'perrier' 
    AND is_drink = true 
    LIMIT 1;
    
    IF perrier_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Perrier', 'Eau gazeuse Perrier', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO perrier_id;
        RAISE NOTICE '✅ Perrier créé: %', perrier_id;
    ELSE
        RAISE NOTICE '✅ Perrier existe: %', perrier_id;
    END IF;

    -- Eau
    SELECT id INTO eau_id FROM menus 
    WHERE restaurant_id = restaurant_id_var 
    AND LOWER(nom) = 'eau' 
    AND is_drink = true 
    LIMIT 1;
    
    IF eau_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Eau', 'Eau plate', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO eau_id;
        RAISE NOTICE '✅ Eau créé: %', eau_id;
    ELSE
        RAISE NOTICE '✅ Eau existe: %', eau_id;
    END IF;

    -- 3. Construire le tableau avec TOUTES les boissons
    all_drink_ids := ARRAY[pepsi_id, orangina_id, ice_tea_id, perrier_id, eau_id]::UUID[];
    
    RAISE NOTICE '📋 Tableau complet des boissons: %', all_drink_ids;
    RAISE NOTICE '📊 Nombre de boissons: %', array_length(all_drink_ids, 1);

    -- 4. FORCER la mise à jour de TOUS les menus (même ceux qui ont déjà drink_options)
    UPDATE menus
    SET drink_options = all_drink_ids
    WHERE restaurant_id = restaurant_id_var
      AND is_drink = false;
    
    GET DIAGNOSTICS menus_updated = ROW_COUNT;
    RAISE NOTICE '✅ % menus mis à jour avec toutes les boissons', menus_updated;

    -- 5. FORCER la mise à jour de TOUTES les formules
    UPDATE formulas
    SET drink_options = all_drink_ids
    WHERE restaurant_id = restaurant_id_var;
    
    RAISE NOTICE '✅ Formules mises à jour avec toutes les boissons';

    -- 6. Vérification finale
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Mise à jour terminée !';
    RAISE NOTICE '📝 Vérifiez maintenant avec le script de diagnostic';

END $$;

-- Vérification immédiate après exécution
SELECT 
    m.id,
    m.nom,
    m.drink_options,
    array_length(m.drink_options, 1) as nb_boissons,
    CASE 
        WHEN array_length(m.drink_options, 1) = 5 THEN '✅ OK'
        ELSE '❌ PROBLÈME'
    END as statut
FROM menus m
WHERE m.restaurant_id IN (
    SELECT id FROM restaurants
    WHERE LOWER(nom) LIKE '%99%street%food%'
       OR LOWER(nom) LIKE '%street%food%'
       OR LOWER(nom) = '99 street food'
)
AND m.is_drink = false
ORDER BY m.nom;

