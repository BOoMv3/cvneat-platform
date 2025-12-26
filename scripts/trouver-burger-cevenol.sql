-- Script pour trouver le Burger Cévenol dans la base de données
-- À exécuter dans Supabase SQL Editor pour voir le nom exact

-- Recherche flexible de tous les restaurants contenant des mots-clés
SELECT 
    id,
    nom,
    email,
    telephone,
    ferme_manuellement,
    status,
    created_at
FROM restaurants
WHERE nom ILIKE '%burger%' 
   OR nom ILIKE '%cevenol%'
   OR nom ILIKE '%cévenol%'
ORDER BY nom;

-- Si aucun résultat, afficher tous les restaurants pour trouver le bon nom
-- (Décommentez si nécessaire)
-- SELECT id, nom, email FROM restaurants ORDER BY nom;

