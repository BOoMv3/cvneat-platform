-- Script de diagnostic simple pour les boissons - 99 street food
-- À exécuter dans Supabase SQL Editor pour voir exactement ce qui se passe

-- 1. Trouver le restaurant
SELECT 
    id,
    nom,
    user_id
FROM restaurants
WHERE LOWER(nom) LIKE '%99%street%food%'
   OR LOWER(nom) LIKE '%street%food%'
   OR LOWER(nom) = '99 street food';

-- 2. Vérifier TOUTES les boissons du restaurant
SELECT 
    id,
    nom,
    prix,
    is_drink,
    disponible,
    category,
    created_at
FROM menus
WHERE restaurant_id IN (
    SELECT id FROM restaurants
    WHERE LOWER(nom) LIKE '%99%street%food%'
       OR LOWER(nom) LIKE '%street%food%'
       OR LOWER(nom) = '99 street food'
)
AND is_drink = true
ORDER BY nom;

-- 3. Vérifier le menu "Menu Sandwich Medina" spécifiquement
SELECT 
    m.id,
    m.nom,
    m.category,
    m.drink_options,
    array_length(m.drink_options, 1) as nombre_boissons,
    m.drink_options::text as drink_options_text
FROM menus m
WHERE m.nom LIKE '%Menu Sandwich Medina%'
AND m.restaurant_id IN (
    SELECT id FROM restaurants
    WHERE LOWER(nom) LIKE '%99%street%food%'
       OR LOWER(nom) LIKE '%street%food%'
       OR LOWER(nom) = '99 street food'
);

-- 4. Vérifier si les IDs dans drink_options correspondent bien aux boissons
SELECT 
    m.id as menu_id,
    m.nom as menu_nom,
    m.drink_options,
    unnest(m.drink_options) as boisson_id,
    b.nom as boisson_nom,
    b.disponible as boisson_disponible
FROM menus m
LEFT JOIN menus b ON b.id = ANY(m.drink_options)
WHERE m.nom LIKE '%Menu Sandwich Medina%'
AND m.restaurant_id IN (
    SELECT id FROM restaurants
    WHERE LOWER(nom) LIKE '%99%street%food%'
       OR LOWER(nom) LIKE '%street%food%'
       OR LOWER(nom) = '99 street food'
)
AND m.is_drink = false;

-- 5. Vérifier TOUS les menus qui devraient avoir des boissons
SELECT 
    m.id,
    m.nom,
    m.category,
    m.drink_options,
    array_length(m.drink_options, 1) as nb_boissons,
    CASE 
        WHEN m.drink_options IS NULL THEN 'PAS DE DRINK_OPTIONS'
        WHEN array_length(m.drink_options, 1) IS NULL THEN 'DRINK_OPTIONS VIDE'
        WHEN array_length(m.drink_options, 1) = 1 THEN 'SEULEMENT 1 BOISSON'
        WHEN array_length(m.drink_options, 1) < 5 THEN 'MANQUE DES BOISSONS'
        ELSE 'OK (5 boissons)'
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

