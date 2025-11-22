-- ============================================
-- EXEMPLE CONCRET : Corriger une Commande avec Formule
-- ============================================
-- ⚠️ REMPLACEZ TOUTES LES VALEURS PAR LES VRAIES VALEURS DE VOTRE COMMANDE

-- ÉTAPE 1 : Trouver une commande problématique
-- ============================================
SELECT 
    c.id as commande_id,
    c.created_at,
    c.total,
    c.statut,
    r.nom as restaurant,
    COUNT(dc.id) as nb_details
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN details_commande dc ON c.id = dc.commande_id
WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
  AND NOT EXISTS (
    SELECT 1 FROM details_commande dc2 WHERE dc2.commande_id = c.id
  )
  AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.id, c.created_at, c.total, c.statut, r.nom
ORDER BY c.created_at DESC
LIMIT 5;

-- ⚠️ NOTEZ L'ID DE LA COMMANDE (ex: 'abc123-def456-...')
-- ⚠️ NOTEZ LE TOTAL (ex: 15.00)

-- ÉTAPE 2 : Trouver les formules du Cévenol Burger
-- ============================================
SELECT 
    f.id as formula_id,
    f.nom as formula_nom,
    f.prix as formula_prix,
    r.nom as restaurant
FROM formulas f
INNER JOIN restaurants r ON f.restaurant_id = r.id
WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
ORDER BY f.nom;

-- ⚠️ NOTEZ L'ID DE LA FORMULE (ex: 'formula-uuid-123')
-- ⚠️ NOTEZ LE NOM DE LA FORMULE (ex: 'Formule Classic')
-- ⚠️ NOTEZ LE PRIX (ex: 15.00)

-- ÉTAPE 3 : Voir les éléments d'une formule spécifique
-- ============================================
-- Remplacez 'FORMULA_ID_ICI' par l'ID réel de la formule

SELECT 
    f.id as formula_id,
    f.nom as formula_nom,
    f.prix as formula_prix,
    fi.order_index,
    fi.menu_id,
    m.nom as menu_nom,
    m.prix as menu_prix,
    CASE 
        WHEN fi.order_index = 0 THEN '🍔 Burger (prix total ici)'
        WHEN fi.order_index = 1 THEN '🍟 Frites (prix 0)'
        ELSE '📦 Autre élément'
    END as role
FROM formulas f
INNER JOIN formula_items fi ON f.id = fi.formula_id
INNER JOIN menus m ON fi.menu_id = m.id
WHERE f.id = 'FORMULA_ID_ICI'  -- ⚠️ REMPLACER PAR L'ID RÉEL
ORDER BY fi.order_index;

-- ⚠️ NOTEZ LES IDs DES MENUS :
--    - Burger ID (order_index = 0)
--    - Frites ID (order_index = 1)
--    - Autres éléments si présents

-- ÉTAPE 4 : Trouver une boisson courante (si vous ne savez pas laquelle)
-- ============================================
SELECT 
    m.id as drink_id,
    m.nom as drink_nom,
    m.prix as drink_prix,
    'Boisson la plus courante' as note
FROM menus m
INNER JOIN restaurants r ON m.restaurant_id = r.id
WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
  AND m.is_drink = true
  AND LOWER(m.nom) LIKE '%coca%'  -- Coca-Cola est généralement la plus courante
LIMIT 1;

-- ⚠️ NOTEZ L'ID DE LA BOISSON (ex: 'drink-uuid-456')
-- Si pas de résultat, essayez avec '%sprite%' ou '%fanta%'

-- ÉTAPE 5 : CORRECTION - Exemple Complet
-- ============================================
-- ⚠️ REMPLACEZ TOUTES LES VALEURS ENTRE '...' PAR LES VRAIES VALEURS

BEGIN;

-- Exemple avec des valeurs fictives :
-- Commande ID : 'abc123-def456-ghi789'
-- Formule ID : 'formula-123'
-- Burger ID : 'burger-456'
-- Frites ID : 'frites-789'
-- Boisson ID : 'drink-321'
-- Prix total : 15.00

-- Détail 1 : Burger (avec le prix total de la formule)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'abc123-def456-ghi789',      -- ⚠️ ID de la commande (remplacez)
    'burger-456',                -- ⚠️ ID du menu burger (remplacez)
    1,                            -- Quantité
    15.00,                        -- ⚠️ Prix total de la formule (remplacez)
    jsonb_build_object(
        'is_formula_item', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule (remplacez)
        'formula_id', 'formula-123',         -- ⚠️ ID de la formule (remplacez)
        'order_index', 0
    )
);

-- Détail 2 : Frites (prix 0 car inclus)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'abc123-def456-ghi789',      -- ⚠️ ID de la commande (remplacez)
    'frites-789',                -- ⚠️ ID du menu frites (remplacez)
    1,                            -- Quantité
    0.00,                         -- Prix 0 car inclus
    jsonb_build_object(
        'is_formula_item', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule (remplacez)
        'formula_id', 'formula-123',         -- ⚠️ ID de la formule (remplacez)
        'order_index', 1
    )
);

-- Détail 3 : Boisson (prix 0 car inclus)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'abc123-def456-ghi789',      -- ⚠️ ID de la commande (remplacez)
    'drink-321',                 -- ⚠️ ID du menu boisson (remplacez)
    1,                            -- Quantité
    0.00,                         -- Prix 0 car inclus
    jsonb_build_object(
        'is_formula_drink', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule (remplacez)
        'formula_id', 'formula-123'          -- ⚠️ ID de la formule (remplacez)
    )
);

-- Vérification avant validation
SELECT 
    '✅ Vérification des détails créés' as etape;

SELECT 
    dc.id,
    m.nom as menu_nom,
    dc.quantite,
    dc.prix_unitaire,
    CASE 
        WHEN dc.customizations->>'is_formula_item' = 'true' THEN '🍔 Élément formule'
        WHEN dc.customizations->>'is_formula_drink' = 'true' THEN '🥤 Boisson formule'
        ELSE '📦 Article normal'
    END as type,
    dc.customizations->>'formula_name' as formula_name
FROM details_commande dc
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE dc.commande_id = 'abc123-def456-ghi789'  -- ⚠️ REMPLACER PAR L'ID RÉEL
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

-- Si tout est correct, validez :
-- COMMIT;

-- Si erreur, annulez :
-- ROLLBACK;

-- ÉTAPE 6 : Vérification finale
-- ============================================
SELECT 
    '✅ Vérification finale' as etape;

SELECT 
    c.id,
    c.total,
    COUNT(dc.id) as nb_details,
    SUM(dc.prix_unitaire * dc.quantite) as total_details,
    STRING_AGG(m.nom, ' + ') as articles
FROM commandes c
LEFT JOIN details_commande dc ON c.id = dc.commande_id
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE c.id = 'abc123-def456-ghi789'  -- ⚠️ REMPLACER PAR L'ID RÉEL
GROUP BY c.id, c.total;

-- Le total_details doit correspondre au total de la commande (ou être proche)
-- Le nb_details doit être >= 2 (burger + frites minimum)

