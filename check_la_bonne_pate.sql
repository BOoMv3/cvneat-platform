-- Script de vérification et correction pour "La Bonne Pâte"
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier si le restaurant existe
SELECT id, nom, description FROM restaurants WHERE nom = 'La Bonne Pâte';

-- 2. Vérifier les plats du restaurant
SELECT id, nom, description, prix, category, restaurant_id 
FROM menus 
WHERE restaurant_id IN (
  SELECT id FROM restaurants WHERE nom = 'La Bonne Pâte'
)
ORDER BY category, nom;

-- 3. Si aucun plat n'existe, les ajouter
DO $$
DECLARE
    labonnepate_id UUID;
BEGIN
    -- Récupérer l'ID du restaurant
    SELECT id INTO labonnepate_id FROM restaurants WHERE nom = 'La Bonne Pâte' LIMIT 1;
    
    IF labonnepate_id IS NOT NULL THEN
        -- Vérifier s'il y a déjà des plats
        IF NOT EXISTS (SELECT 1 FROM menus WHERE restaurant_id = labonnepate_id) THEN
            RAISE NOTICE 'Ajout des plats pour La Bonne Pâte (ID: %)', labonnepate_id;
            
            -- Ajouter les plats
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
                
            RAISE NOTICE 'Plats ajoutés avec succès pour La Bonne Pâte';
        ELSE
            RAISE NOTICE 'La Bonne Pâte a déjà des plats dans son menu';
        END IF;
    ELSE
        RAISE NOTICE 'Restaurant "La Bonne Pâte" non trouvé';
    END IF;
END $$;

-- 4. Vérifier le résultat final
SELECT 
    m.nom as plat,
    m.description,
    m.prix,
    m.category,
    r.nom as restaurant
FROM menus m
JOIN restaurants r ON m.restaurant_id = r.id
WHERE r.nom = 'La Bonne Pâte'
ORDER BY m.category, m.nom;
