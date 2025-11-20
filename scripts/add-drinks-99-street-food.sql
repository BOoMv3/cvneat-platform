-- Script pour ajouter les boissons au restaurant 99 street food
-- et permettre le choix de boisson dans les formules
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Trouver le restaurant "99 street food"
SELECT 
    id,
    nom,
    user_id
FROM restaurants
WHERE LOWER(nom) LIKE '%99%street%food%'
   OR LOWER(nom) LIKE '%street%food%'
   OR LOWER(nom) = '99 street food';

-- ÉTAPE 2: Ajouter la colonne drink_options aux tables formulas et menus si elle n'existe pas
-- Cette colonne stockera les IDs des boissons disponibles pour chaque formule/menu
ALTER TABLE formulas 
ADD COLUMN IF NOT EXISTS drink_options UUID[] DEFAULT ARRAY[]::UUID[];

ALTER TABLE menus 
ADD COLUMN IF NOT EXISTS drink_options UUID[] DEFAULT ARRAY[]::UUID[];

COMMENT ON COLUMN formulas.drink_options IS 'Tableau des IDs des boissons disponibles pour cette formule. Le client peut choisir une boisson parmi celles-ci.';
COMMENT ON COLUMN menus.drink_options IS 'Tableau des IDs des boissons disponibles pour ce menu. Le client peut choisir une boisson parmi celles-ci.';

-- ÉTAPE 3: Ajouter les 5 boissons au restaurant 99 street food
-- Remplacez 'RESTAURANT_ID_ICI' par l'ID trouvé à l'étape 1
DO $$
DECLARE
    restaurant_id_var UUID;
    pepsi_id UUID;
    orangina_id UUID;
    ice_tea_id UUID;
    perrier_id UUID;
    eau_id UUID;
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

    -- Ajouter Pepsi
    INSERT INTO menus (
        restaurant_id,
        nom,
        description,
        prix,
        category,
        disponible,
        is_drink,
        drink_price_small,
        drink_price_medium,
        drink_price_large
    ) VALUES (
        restaurant_id_var,
        'Pepsi',
        'Boisson gazeuse Pepsi',
        2.00,
        'Boissons',
        true,
        true,
        2.00,
        2.00,
        2.00
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO pepsi_id;

    -- Ajouter Orangina
    INSERT INTO menus (
        restaurant_id,
        nom,
        description,
        prix,
        category,
        disponible,
        is_drink,
        drink_price_small,
        drink_price_medium,
        drink_price_large
    ) VALUES (
        restaurant_id_var,
        'Orangina',
        'Boisson gazeuse aux agrumes',
        2.00,
        'Boissons',
        true,
        true,
        2.00,
        2.00,
        2.00
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO orangina_id;

    -- Ajouter Ice Tea
    INSERT INTO menus (
        restaurant_id,
        nom,
        description,
        prix,
        category,
        disponible,
        is_drink,
        drink_price_small,
        drink_price_medium,
        drink_price_large
    ) VALUES (
        restaurant_id_var,
        'Ice Tea',
        'Thé glacé',
        2.00,
        'Boissons',
        true,
        true,
        2.00,
        2.00,
        2.00
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO ice_tea_id;

    -- Ajouter Perrier
    INSERT INTO menus (
        restaurant_id,
        nom,
        description,
        prix,
        category,
        disponible,
        is_drink,
        drink_price_small,
        drink_price_medium,
        drink_price_large
    ) VALUES (
        restaurant_id_var,
        'Perrier',
        'Eau gazeuse Perrier',
        2.00,
        'Boissons',
        true,
        true,
        2.00,
        2.00,
        2.00
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO perrier_id;

    -- Ajouter Eau
    INSERT INTO menus (
        restaurant_id,
        nom,
        description,
        prix,
        category,
        disponible,
        is_drink,
        drink_price_small,
        drink_price_medium,
        drink_price_large
    ) VALUES (
        restaurant_id_var,
        'Eau',
        'Eau plate',
        2.00,
        'Boissons',
        true,
        true,
        2.00,
        2.00,
        2.00
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO eau_id;

    -- Si les boissons existent déjà, les récupérer
    IF pepsi_id IS NULL THEN
        SELECT id INTO pepsi_id FROM menus 
        WHERE restaurant_id = restaurant_id_var AND LOWER(nom) = 'pepsi' LIMIT 1;
    END IF;

    IF orangina_id IS NULL THEN
        SELECT id INTO orangina_id FROM menus 
        WHERE restaurant_id = restaurant_id_var AND LOWER(nom) = 'orangina' LIMIT 1;
    END IF;

    IF ice_tea_id IS NULL THEN
        SELECT id INTO ice_tea_id FROM menus 
        WHERE restaurant_id = restaurant_id_var AND LOWER(nom) LIKE '%ice%tea%' LIMIT 1;
    END IF;

    IF perrier_id IS NULL THEN
        SELECT id INTO perrier_id FROM menus 
        WHERE restaurant_id = restaurant_id_var AND LOWER(nom) = 'perrier' LIMIT 1;
    END IF;

    IF eau_id IS NULL THEN
        SELECT id INTO eau_id FROM menus 
        WHERE restaurant_id = restaurant_id_var AND LOWER(nom) = 'eau' LIMIT 1;
    END IF;

    -- Mettre à jour toutes les formules existantes pour inclure ces boissons
    UPDATE formulas
    SET drink_options = ARRAY[pepsi_id, orangina_id, ice_tea_id, perrier_id, eau_id]::UUID[]
    WHERE restaurant_id = restaurant_id_var
      AND (drink_options IS NULL OR array_length(drink_options, 1) IS NULL);

    -- Mettre à jour tous les menus existants qui sont des menus (pas des boissons) pour inclure ces boissons
    -- On met à jour les menus qui ont une catégorie contenant "menu" ou "Menu"
    UPDATE menus
    SET drink_options = ARRAY[pepsi_id, orangina_id, ice_tea_id, perrier_id, eau_id]::UUID[]
    WHERE restaurant_id = restaurant_id_var
      AND is_drink = false
      AND (LOWER(category) LIKE '%menu%' OR LOWER(nom) LIKE '%menu%')
      AND (drink_options IS NULL OR array_length(drink_options, 1) IS NULL);

    RAISE NOTICE 'Boissons ajoutées avec succès. IDs: Pepsi=%, Orangina=%, Ice Tea=%, Perrier=%, Eau=%', 
        pepsi_id, orangina_id, ice_tea_id, perrier_id, eau_id;

END $$;

-- ÉTAPE 4: Vérifier les boissons ajoutées
SELECT 
    m.id,
    m.nom,
    m.prix,
    m.is_drink,
    m.drink_price_small,
    m.drink_price_medium,
    m.drink_price_large,
    r.nom as restaurant_nom
FROM menus m
JOIN restaurants r ON r.id = m.restaurant_id
WHERE r.nom LIKE '%99%street%food%'
   OR r.nom LIKE '%street%food%'
   OR r.nom = '99 street food'
AND m.is_drink = true
ORDER BY m.nom;

-- ÉTAPE 5: Vérifier que les formules ont bien les boissons disponibles
SELECT 
    f.id,
    f.nom as formule_nom,
    f.drink_options,
    array_length(f.drink_options, 1) as nombre_boissons_disponibles,
    r.nom as restaurant_nom
FROM formulas f
JOIN restaurants r ON r.id = f.restaurant_id
WHERE r.nom LIKE '%99%street%food%'
   OR r.nom LIKE '%street%food%'
   OR r.nom = '99 street food';

-- ÉTAPE 6: Vérifier que les menus ont bien les boissons disponibles
SELECT 
    m.id,
    m.nom as menu_nom,
    m.category,
    m.drink_options,
    array_length(m.drink_options, 1) as nombre_boissons_disponibles,
    r.nom as restaurant_nom
FROM menus m
JOIN restaurants r ON r.id = m.restaurant_id
WHERE (r.nom LIKE '%99%street%food%'
   OR r.nom LIKE '%street%food%'
   OR r.nom = '99 street food')
AND m.is_drink = false
AND m.drink_options IS NOT NULL
AND array_length(m.drink_options, 1) > 0
ORDER BY m.nom;

