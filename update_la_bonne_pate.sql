-- =============================================================================
-- Script de mise à jour pour le restaurant "La Bonne Pâte" (v7 - Final)
-- =============================================================================
--
-- Instructions :
-- 1. Assurez-vous d'avoir exécuté : ALTER TABLE menus ADD COLUMN category VARCHAR(255);
-- 2. Copiez l'intégralité de ce bloc de code, de "DO" jusqu'à "END $$;".
-- 3. Collez-le dans une nouvelle requête dans l'éditeur SQL de Supabase.
-- 4. Cliquez sur "RUN" sans rien sélectionner pour exécuter le script en une seule fois.
--
-- =============================================================================

DO $$
DECLARE
    labonnepate_id UUID;
BEGIN
    -- Étape 1: Vérifier si le restaurant "La Bonne Pâte" existe déjà
    RAISE NOTICE 'Vérification de l''existence du restaurant "La Bonne Pâte"...';
    SELECT id INTO labonnepate_id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1;
    
    -- Si le restaurant n'existe pas, le créer
    IF labonnepate_id IS NULL THEN
        RAISE NOTICE 'Création du restaurant "La Bonne Pâte"...';
        INSERT INTO restaurants (nom, description, telephone, image_url, adresse, code_postal, ville, email, type_cuisine)
        VALUES (
            'La Bonne Pâte', 
            'Produits frais & italiens. Service sur place et à emporter.', 
            '09 83 96 08 41', 
            'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e',
            '3 rue armand sabatier',
            '34190',
            'Ganges',
            'labonnepate@example.com',
            'Italienne'
        )
        RETURNING id INTO labonnepate_id;
    END IF;
    
    -- Étape 2: Mettre à jour les informations du restaurant.
    RAISE NOTICE 'Mise à jour des informations pour La Bonne Pâte (ID: %)', labonnepate_id;
    UPDATE restaurants
    SET 
        telephone = '09 83 96 08 41',
        image_url = 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e', 
        horaires = '{
            "Lundi": "12:00-13:30, 18:30-21:30",
            "Mardi": "Fermé",
            "Mercredi": "12:00-13:30, 18:30-21:30",
            "Jeudi": "12:00-13:30, 18:30-21:30",
            "Vendredi": "18:00-22:00",
            "Samedi": "18:00-22:00",
            "Dimanche": "18:00-22:00"
        }'::jsonb,
        description = 'Produits frais & italiens. Service sur place et à emporter.',
        adresse = '3 rue armand sabatier',
        code_postal = '34190',
        ville = 'Ganges'
    WHERE id = labonnepate_id;

    -- Étape 3: Nettoyer l'ancien menu pour ce restaurant.
    RAISE NOTICE 'Suppression de l''ancien menu pour repartir sur une base propre...';
    DELETE FROM menus WHERE restaurant_id = labonnepate_id;

    -- Étape 4: Ajouter les plats en respectant la carte.
    RAISE NOTICE 'Ajout des plats dans la table "menus"...';
    INSERT INTO menus (restaurant_id, nom, description, prix, category) VALUES
        -- Base tomate
        (labonnepate_id, 'Margherita', 'Mozzarella Fior Di Latte, pesto de basilic', 10.00, 'Base tomate'),
        (labonnepate_id, 'Reine', 'Mozzarella Fior Di Latte, jambon blanc, champignons philita', 13.00, 'Base tomate'),
        (labonnepate_id, 'Paysanne', 'Mozzarella Fior Di Latte, jambon cru, roquette, Parmigiano, crème de balsamique', 13.00, 'Base tomate'),
        (labonnepate_id, 'Chorizo', 'Mozzarella Fior Di Latte, chorizo, oignons, Parmigiano', 13.00, 'Base tomate'),
        (labonnepate_id, 'Bolo', 'Mozzarella Fior Di Latte, viande hachée de bœuf, oignons rouges', 14.00, 'Base tomate'),
        (labonnepate_id, 'Calzone', 'Mozzarella Fior Di Latte, jambon blanc, œuf', 12.00, 'Base tomate'),
        (labonnepate_id, 'Végétarienne', 'Mozzarella Fior Di Latte, oignons, champignons, shiitake, apfels cuisson, roquette, tomates confite, Parmigiano, burrata, crème de balsamique', 16.00, 'Base tomate'),
        (labonnepate_id, 'Pizza du moment', '', 16.00, 'Base tomate'),
        -- Base crème
        (labonnepate_id, 'Coppa', 'Mozzarella Fior Di Latte, et apfels cuisson, coppa, roquette, Parmigiano, cerneaux de noix, burrata, crème de balsamique', 18.00, 'Base crème'),
        (labonnepate_id, 'Flambée', 'Mozzarella Fior Di Latte, lard fumé, oignons', 12.00, 'Base crème'),
        (labonnepate_id, 'Chevrette', 'Mozzarella Fior Di Latte, Pélardon, oignons, miel', 14.00, 'Base crème'),
        (labonnepate_id, 'Fromagère', 'Mozzarella Fior Di Latte, Taleggio, Gorgonzola, Parmigiano', 13.00, 'Base crème'),
        (labonnepate_id, 'Tartiflette', 'Mozzarella Fior Di Latte, lard fumé, pomme de terre, Reblochon', 14.00, 'Base crème'),
        (labonnepate_id, 'Tartufo', 'Crème de truffe, Mozzarella Fior Di Latte, et apfels cuisson, jambon blanc truffé, Stracciatella à la truffe, pesto de basilic', 18.00, 'Base crème'),
        (labonnepate_id, 'Mortadella', 'Mozzarella Fior Di Latte, apfels cuisson, mortadelle, pesto de basilic, éclats de pistache, roquette, burrata', 18.00, 'Base crème'),
        -- Nos Puccias
        (labonnepate_id, 'La Puccia Italienne', 'Pesto, Parmigiano, jambon de Parme, roquette, tomate confite, Burrata', 10.00, 'Nos Puccias'),
        (labonnepate_id, 'La Puccia Végétarienne', 'Pesto, tomate confite, roquette, oignons rouges, Taleggio, Burrata, crème de balsamique', 10.00, 'Nos Puccias'),
        (labonnepate_id, 'La Puccia Tartufo + 2€', 'Crème de truffe, jambon blanc truffé, roquette, pesto, Burrata', 12.00, 'Nos Puccias'),
        (labonnepate_id, 'La Puccia Coppa', 'Taille d''olive, roquette, coppa, Parmigiano, Taleggio, crème de balsamique', 10.00, 'Nos Puccias'),
        (labonnepate_id, 'La Puccia Mortadella', 'Pesto de basilic, mortadelle, roquette, Parmigiano, burrata', 10.00, 'Nos Puccias'),
        (labonnepate_id, 'La Puccia Classique', 'Base tomate, mozzarella Fior Di Latte, Taleggio, crasin de bœuf 250g, oignons, roquette', 10.00, 'Nos Puccias'),
        (labonnepate_id, 'La Puccia Cevenole', 'Base crème, mozzarella Fior Di Latte, crasin de bœuf 250g, oignons, pélardon, miel', 10.00, 'Nos Puccias'),
        -- Dessert du moment
        (labonnepate_id, 'Piggetta Nocciolata', 'éclats de pistache', 7.00, 'Dessert du moment');

    RAISE NOTICE 'Script terminé. Mise à jour de "La Bonne Pâte" effectuée.';
END $$; 