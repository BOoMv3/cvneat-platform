-- Script de diagnostic et correction pour les boissons du restaurant 99 street food
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Trouver le restaurant
DO $$
DECLARE
    restaurant_id_var UUID;
    pepsi_id UUID;
    orangina_id UUID;
    ice_tea_id UUID;
    perrier_id UUID;
    eau_id UUID;
    all_drink_ids UUID[];
BEGIN
    -- Trouver le restaurant
    SELECT id INTO restaurant_id_var
    FROM restaurants
    WHERE LOWER(nom) LIKE '%99%street%food%'
       OR LOWER(nom) LIKE '%street%food%'
       OR LOWER(nom) = '99 street food'
    LIMIT 1;

    IF restaurant_id_var IS NULL THEN
        RAISE EXCEPTION 'Restaurant 99 street food non trouvé';
    END IF;

    RAISE NOTICE 'Restaurant trouvé: %', restaurant_id_var;

    -- Récupérer ou créer toutes les boissons
    -- Pepsi
    SELECT id INTO pepsi_id FROM menus 
    WHERE restaurant_id = restaurant_id_var AND LOWER(nom) = 'pepsi' AND is_drink = true LIMIT 1;
    
    IF pepsi_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Pepsi', 'Boisson gazeuse Pepsi', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO pepsi_id;
        RAISE NOTICE 'Pepsi créé: %', pepsi_id;
    ELSE
        RAISE NOTICE 'Pepsi existe déjà: %', pepsi_id;
    END IF;

    -- Orangina
    SELECT id INTO orangina_id FROM menus 
    WHERE restaurant_id = restaurant_id_var AND LOWER(nom) = 'orangina' AND is_drink = true LIMIT 1;
    
    IF orangina_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Orangina', 'Boisson gazeuse aux agrumes', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO orangina_id;
        RAISE NOTICE 'Orangina créé: %', orangina_id;
    ELSE
        RAISE NOTICE 'Orangina existe déjà: %', orangina_id;
    END IF;

    -- Ice Tea
    SELECT id INTO ice_tea_id FROM menus 
    WHERE restaurant_id = restaurant_id_var 
    AND (LOWER(nom) LIKE '%ice%tea%' OR LOWER(nom) LIKE '%icetea%' OR LOWER(nom) = 'ice tea')
    AND is_drink = true LIMIT 1;
    
    IF ice_tea_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Ice Tea', 'Thé glacé', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO ice_tea_id;
        RAISE NOTICE 'Ice Tea créé: %', ice_tea_id;
    ELSE
        RAISE NOTICE 'Ice Tea existe déjà: %', ice_tea_id;
    END IF;

    -- Perrier
    SELECT id INTO perrier_id FROM menus 
    WHERE restaurant_id = restaurant_id_var AND LOWER(nom) = 'perrier' AND is_drink = true LIMIT 1;
    
    IF perrier_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Perrier', 'Eau gazeuse Perrier', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO perrier_id;
        RAISE NOTICE 'Perrier créé: %', perrier_id;
    ELSE
        RAISE NOTICE 'Perrier existe déjà: %', perrier_id;
    END IF;

    -- Eau
    SELECT id INTO eau_id FROM menus 
    WHERE restaurant_id = restaurant_id_var 
    AND LOWER(nom) = 'eau' 
    AND is_drink = true 
    AND (LOWER(description) LIKE '%plate%' OR description IS NULL)
    LIMIT 1;
    
    IF eau_id IS NULL THEN
        INSERT INTO menus (
            restaurant_id, nom, description, prix, category, disponible, is_drink,
            drink_price_small, drink_price_medium, drink_price_large
        ) VALUES (
            restaurant_id_var, 'Eau', 'Eau plate', 2.00, 'Boissons', true, true,
            2.00, 2.00, 2.00
        ) RETURNING id INTO eau_id;
        RAISE NOTICE 'Eau créé: %', eau_id;
    ELSE
        RAISE NOTICE 'Eau existe déjà: %', eau_id;
    END IF;

    -- Construire le tableau avec toutes les boissons (en excluant les NULL)
    all_drink_ids := ARRAY[]::UUID[];
    IF pepsi_id IS NOT NULL THEN all_drink_ids := array_append(all_drink_ids, pepsi_id); END IF;
    IF orangina_id IS NOT NULL THEN all_drink_ids := array_append(all_drink_ids, orangina_id); END IF;
    IF ice_tea_id IS NOT NULL THEN all_drink_ids := array_append(all_drink_ids, ice_tea_id); END IF;
    IF perrier_id IS NOT NULL THEN all_drink_ids := array_append(all_drink_ids, perrier_id); END IF;
    IF eau_id IS NOT NULL THEN all_drink_ids := array_append(all_drink_ids, eau_id); END IF;

    RAISE NOTICE 'Tableau des boissons: %', all_drink_ids;
    RAISE NOTICE 'Nombre de boissons: %', array_length(all_drink_ids, 1);

    -- Mettre à jour TOUS les menus (pas seulement ceux avec "menu" dans le nom)
    -- qui ne sont pas des boissons
    UPDATE menus
    SET drink_options = all_drink_ids
    WHERE restaurant_id = restaurant_id_var
      AND is_drink = false
      AND (drink_options IS NULL 
           OR array_length(drink_options, 1) IS NULL 
           OR array_length(drink_options, 1) < 5);

    RAISE NOTICE 'Menus mis à jour avec toutes les boissons';

    -- Mettre à jour toutes les formules
    UPDATE formulas
    SET drink_options = all_drink_ids
    WHERE restaurant_id = restaurant_id_var
      AND (drink_options IS NULL 
           OR array_length(drink_options, 1) IS NULL 
           OR array_length(drink_options, 1) < 5);

    RAISE NOTICE 'Formules mises à jour avec toutes les boissons';

END $$;

-- ÉTAPE 2: Vérifier toutes les boissons
SELECT 
    m.id,
    m.nom,
    m.prix,
    m.is_drink,
    m.disponible,
    r.nom as restaurant_nom
FROM menus m
JOIN restaurants r ON r.id = m.restaurant_id
WHERE (r.nom LIKE '%99%street%food%'
   OR r.nom LIKE '%street%food%'
   OR r.nom = '99 street food')
AND m.is_drink = true
ORDER BY m.nom;

-- ÉTAPE 3: Vérifier que les menus ont bien toutes les boissons
SELECT 
    m.id,
    m.nom,
    m.category,
    m.drink_options,
    array_length(m.drink_options, 1) as nombre_boissons,
    CASE 
        WHEN array_length(m.drink_options, 1) = 5 THEN 'OK'
        ELSE 'MANQUE DES BOISSONS'
    END as statut
FROM menus m
JOIN restaurants r ON r.id = m.restaurant_id
WHERE (r.nom LIKE '%99%street%food%'
   OR r.nom LIKE '%street%food%'
   OR r.nom = '99 street food')
AND m.is_drink = false
ORDER BY m.nom;

-- ÉTAPE 4: Vérifier les formules
SELECT 
    f.id,
    f.nom as formule_nom,
    f.drink_options,
    array_length(f.drink_options, 1) as nombre_boissons,
    CASE 
        WHEN array_length(f.drink_options, 1) = 5 THEN 'OK'
        ELSE 'MANQUE DES BOISSONS'
    END as statut
FROM formulas f
JOIN restaurants r ON r.id = f.restaurant_id
WHERE (r.nom LIKE '%99%street%food%'
   OR r.nom LIKE '%street%food%'
   OR r.nom = '99 street food')
ORDER BY f.nom;

