-- Script de diagnostic pour les commandes avec formules sans détails
-- À exécuter dans Supabase SQL Editor

-- 1. Trouver les commandes du Cévenol Burger sans détails
SELECT 
    '🔍 COMMANDES SANS DÉTAILS - CÉVENOL BURGER' as titre;

SELECT 
    c.id,
    c.created_at,
    c.statut,
    c.total,
    r.nom as restaurant,
    COUNT(dc.id) as nb_details,
    CASE 
        WHEN COUNT(dc.id) = 0 THEN '❌ AUCUN DÉTAIL'
        ELSE '✅ OK'
    END as statut_details
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN details_commande dc ON c.id = dc.commande_id
WHERE LOWER(r.nom) LIKE '%cévenol%'
   OR LOWER(r.nom) LIKE '%cevenol%'
GROUP BY c.id, c.created_at, c.statut, c.total, r.nom
HAVING COUNT(dc.id) = 0
ORDER BY c.created_at DESC
LIMIT 20;

-- 2. Vérifier les détails de commande avec customizations de formule
SELECT 
    '📦 DÉTAILS AVEC FORMULES' as titre;

SELECT 
    dc.id,
    dc.commande_id,
    dc.plat_id,
    dc.quantite,
    dc.prix_unitaire,
    dc.customizations,
    m.nom as menu_nom,
    CASE 
        WHEN dc.customizations::text LIKE '%is_formula%' THEN '✅ Formule'
        WHEN dc.customizations::text LIKE '%combo%' THEN '✅ Combo'
        ELSE '❌ Normal'
    END as type_item
FROM details_commande dc
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE dc.customizations::text LIKE '%formula%'
   OR dc.customizations::text LIKE '%combo%'
ORDER BY dc.created_at DESC
LIMIT 20;

-- 3. Commandes récentes du Cévenol avec leurs détails
SELECT 
    '📊 COMMANDES RÉCENTES CÉVENOL AVEC DÉTAILS' as titre;

SELECT 
    c.id as commande_id,
    c.created_at,
    c.statut,
    c.total,
    COUNT(dc.id) as nb_details,
    STRING_AGG(m.nom, ', ') as articles
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN details_commande dc ON c.id = dc.commande_id
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
  AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.id, c.created_at, c.statut, c.total
ORDER BY c.created_at DESC
LIMIT 10;

-- 4. Vérifier la structure des formules dans la base
SELECT 
    '🍔 FORMULES DISPONIBLES' as titre;

SELECT 
    f.id,
    f.nom,
    f.prix,
    f.restaurant_id,
    r.nom as restaurant,
    COUNT(fi.id) as nb_elements,
    STRING_AGG(m.nom, ' + ') as elements
FROM formulas f
INNER JOIN restaurants r ON f.restaurant_id = r.id
LEFT JOIN formula_items fi ON f.id = fi.formula_id
LEFT JOIN menus m ON fi.menu_id = m.id
WHERE LOWER(r.nom) LIKE '%cévenol%'
   OR LOWER(r.nom) LIKE '%cevenol%'
GROUP BY f.id, f.nom, f.prix, f.restaurant_id, r.nom
ORDER BY f.nom;

-- 5. Vérifier les commandes avec formules dans les détails
SELECT 
    '🔍 COMMANDES AVEC FORMULES DANS LES DÉTAILS' as titre;

SELECT 
    c.id,
    c.created_at,
    r.nom as restaurant,
    dc.customizations->>'formula_name' as nom_formule,
    dc.customizations->>'formula_id' as formula_id,
    m.nom as element_formule,
    dc.quantite,
    dc.prix_unitaire
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
INNER JOIN details_commande dc ON c.id = dc.commande_id
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE dc.customizations::text LIKE '%is_formula%'
  AND (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
ORDER BY c.created_at DESC
LIMIT 20;

