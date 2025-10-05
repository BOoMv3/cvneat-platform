-- Script pour créer une commande de test
-- À exécuter dans Supabase SQL Editor

-- 1. Créer une commande de test pour le restaurant "Restaurant Test" (ID: 4572cee6-1fc6-4f32-b007-57c46871ec70)
INSERT INTO commandes (
  id,
  user_id,
  restaurant_id,
  statut,
  total,
  frais_livraison,
  adresse_livraison,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- Commande sans utilisateur connecté
  '4572cee6-1fc6-4f32-b007-57c46871ec70', -- Restaurant Test
  'en_attente',
  25.50,
  2.50,
  '123 Rue de Test, 34000 Montpellier',
  NOW()
);

-- 2. Récupérer l'ID de la commande créée pour créer les détails
-- (On va utiliser une approche différente avec une fonction)

-- 3. Créer une fonction pour insérer une commande complète
CREATE OR REPLACE FUNCTION create_test_order()
RETURNS UUID AS $$
DECLARE
    order_id UUID;
    menu_item_id UUID;
BEGIN
    -- Créer la commande
    INSERT INTO commandes (
        user_id,
        restaurant_id,
        statut,
        total,
        frais_livraison,
        adresse_livraison,
        created_at
    ) VALUES (
        NULL,
        '4572cee6-1fc6-4f32-b007-57c46871ec70',
        'en_attente',
        25.50,
        2.50,
        '123 Rue de Test, 34000 Montpellier',
        NOW()
    ) RETURNING id INTO order_id;
    
    -- Récupérer un item du menu du restaurant
    SELECT id INTO menu_item_id 
    FROM menus 
    WHERE restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70' 
    LIMIT 1;
    
    -- Si on trouve un item, créer les détails
    IF menu_item_id IS NOT NULL THEN
        INSERT INTO details_commande (
            commande_id,
            plat_id,
            quantite,
            prix_unitaire,
            created_at
        ) VALUES (
            order_id,
            menu_item_id,
            2,
            11.50,
            NOW()
        );
    END IF;
    
    RETURN order_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Exécuter la fonction pour créer une commande de test
SELECT create_test_order() as nouvelle_commande_id;

-- 5. Vérifier que la commande a été créée
SELECT 
    c.id,
    c.restaurant_id,
    c.statut,
    c.total,
    c.adresse_livraison,
    c.created_at,
    r.nom as restaurant_nom
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE r.id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
ORDER BY c.created_at DESC
LIMIT 5;

-- 6. Vérifier les détails de la commande
SELECT 
    dc.id,
    dc.commande_id,
    dc.quantite,
    dc.prix_unitaire,
    m.nom as plat_nom
FROM details_commande dc
JOIN menus m ON dc.plat_id = m.id
JOIN commandes c ON dc.commande_id = c.id
WHERE c.restaurant_id = '4572cee6-1fc6-4f32-b007-57c46871ec70'
ORDER BY dc.created_at DESC
LIMIT 10;
