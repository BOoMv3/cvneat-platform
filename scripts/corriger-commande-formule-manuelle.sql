-- ============================================
-- GUIDE : CORRIGER MANUELLEMENT UNE COMMANDE AVEC FORMULE SANS DÉTAILS
-- ============================================

-- ÉTAPE 1 : IDENTIFIER LA COMMANDE PROBLÉMATIQUE
-- ============================================
-- Remplacez 'COMMANDE_ID_ICI' par l'ID réel de la commande

SELECT 
    '🔍 ÉTAPE 1 : Vérifier la commande' as etape;

SELECT 
    c.id,
    c.created_at,
    c.statut,
    c.total,
    c.restaurant_id,
    r.nom as restaurant,
    COUNT(dc.id) as nb_details_existants
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN details_commande dc ON c.id = dc.commande_id
WHERE c.id = 'COMMANDE_ID_ICI'  -- ⚠️ REMPLACER PAR L'ID RÉEL
GROUP BY c.id, c.created_at, c.statut, c.total, c.restaurant_id, r.nom;

-- ÉTAPE 2 : RÉCUPÉRER LES DONNÉES DE LA COMMANDE DEPUIS STRIPE
-- ============================================
-- Vous devez récupérer les données depuis Stripe Dashboard ou via l'API
-- Les métadonnées Stripe contiennent généralement les items de la commande

-- Exemple de structure attendue depuis Stripe metadata:
-- {
--   "items": [
--     {
--       "id": "formula-uuid",
--       "nom": "Formule Classic",
--       "prix": 15.00,
--       "is_formula": true,
--       "formula_items": [
--         { "menu_id": "burger-uuid", "quantity": 1 },
--         { "menu_id": "frites-uuid", "quantity": 1 }
--       ],
--       "selected_drink": { "id": "drink-uuid" }
--     }
--   ]
-- }

-- ÉTAPE 3 : TROUVER LES IDs DES MENUS DE LA FORMULE
-- ============================================
-- Remplacez 'FORMULA_ID_ICI' par l'ID de la formule

SELECT 
    '🔍 ÉTAPE 3 : Trouver les éléments de la formule' as etape;

SELECT 
    f.id as formula_id,
    f.nom as formula_nom,
    f.prix as formula_prix,
    fi.order_index,
    fi.menu_id,
    m.nom as menu_nom,
    m.prix as menu_prix
FROM formulas f
INNER JOIN formula_items fi ON f.id = fi.formula_id
INNER JOIN menus m ON fi.menu_id = m.id
WHERE f.id = 'FORMULA_ID_ICI'  -- ⚠️ REMPLACER PAR L'ID RÉEL
ORDER BY fi.order_index;

-- ÉTAPE 4 : TROUVER LES BOISSONS DISPONIBLES POUR LA FORMULE
-- ============================================

SELECT 
    '🔍 ÉTAPE 4 : Boissons disponibles pour la formule' as etape;

SELECT 
    f.id as formula_id,
    f.drink_options,
    m.id as drink_id,
    m.nom as drink_nom,
    m.prix as drink_prix
FROM formulas f
CROSS JOIN LATERAL jsonb_array_elements_text(f.drink_options) AS drink_id
INNER JOIN menus m ON m.id::text = drink_id
WHERE f.id = 'FORMULA_ID_ICI'  -- ⚠️ REMPLACER PAR L'ID RÉEL
ORDER BY m.nom;

-- ÉTAPE 5 : CRÉER LES DÉTAILS DE COMMANDE MANUELLEMENT
-- ============================================
-- ⚠️ REMPLACEZ TOUS LES VALEURS ENTRE '...' PAR LES VRAIES VALEURS

BEGIN;

-- Exemple pour une formule avec burger, frites et boisson
-- Remplacez toutes les valeurs entre '...'

-- Détail 1 : Burger (premier élément, avec le prix total de la formule)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'COMMANDE_ID_ICI',           -- ⚠️ ID de la commande
    'BURGER_MENU_ID_ICI',        -- ⚠️ ID du menu burger
    1,                            -- Quantité
    15.00,                        -- ⚠️ Prix total de la formule (sur le premier élément)
    jsonb_build_object(
        'is_formula_item', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule
        'formula_id', 'FORMULA_ID_ICI',     -- ⚠️ ID de la formule
        'order_index', 0
    )
);

-- Détail 2 : Frites (deuxième élément, prix 0 car inclus)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'COMMANDE_ID_ICI',           -- ⚠️ ID de la commande
    'Frites_MENU_ID_ICI',        -- ⚠️ ID du menu frites
    1,                            -- Quantité
    0.00,                         -- Prix 0 car inclus dans la formule
    jsonb_build_object(
        'is_formula_item', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule
        'formula_id', 'FORMULA_ID_ICI',     -- ⚠️ ID de la formule
        'order_index', 1
    )
);

-- Détail 3 : Boisson (si sélectionnée)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'COMMANDE_ID_ICI',           -- ⚠️ ID de la commande
    'DRINK_MENU_ID_ICI',         -- ⚠️ ID du menu boisson
    1,                            -- Quantité
    0.00,                         -- Prix 0 car inclus dans la formule
    jsonb_build_object(
        'is_formula_drink', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule
        'formula_id', 'FORMULA_ID_ICI'      -- ⚠️ ID de la formule
    )
);

-- ÉTAPE 6 : VÉRIFIER QUE LES DÉTAILS ONT ÉTÉ CRÉÉS
-- ============================================

SELECT 
    '✅ ÉTAPE 6 : Vérification' as etape;

SELECT 
    dc.id,
    dc.commande_id,
    dc.plat_id,
    m.nom as menu_nom,
    dc.quantite,
    dc.prix_unitaire,
    dc.customizations
FROM details_commande dc
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE dc.commande_id = 'COMMANDE_ID_ICI'  -- ⚠️ REMPLACER PAR L'ID RÉEL
ORDER BY 
    CASE 
        WHEN dc.customizations->>'is_formula_item' = 'true' 
        THEN (dc.customizations->>'order_index')::int
        ELSE 999
    END,
    CASE 
        WHEN dc.customizations->>'is_formula_drink' = 'true' 
        THEN 1 
        ELSE 0 
    END;

-- Si tout est correct, validez avec COMMIT, sinon ROLLBACK
-- COMMIT;
-- ROLLBACK;

