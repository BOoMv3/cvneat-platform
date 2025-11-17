-- Script SQL pour remettre le compte de Théo (livreur CVN'EAT) à 0
-- À exécuter dans Supabase SQL Editor

-- 1. Trouver Théo dans la table users
-- Vérifier d'abord quel livreur correspond à Théo
SELECT 
    id,
    nom,
    prenom,
    email,
    role
FROM users
WHERE role = 'delivery'
  AND (
    LOWER(nom) LIKE '%théo%' 
    OR LOWER(prenom) LIKE '%théo%'
    OR LOWER(nom) LIKE '%theo%'
    OR LOWER(prenom) LIKE '%theo%'
  );

-- 2. Voir les stats actuelles de Théo (remplacez l'ID par celui trouvé ci-dessus)
-- Remplacez 'THEO_USER_ID' par l'ID réel de Théo
/*
SELECT 
    ds.*,
    u.nom,
    u.prenom,
    u.email
FROM delivery_stats ds
JOIN users u ON u.id = ds.delivery_id
WHERE u.role = 'delivery'
  AND (
    LOWER(u.nom) LIKE '%théo%' 
    OR LOWER(u.prenom) LIKE '%théo%'
    OR LOWER(u.nom) LIKE '%theo%'
    OR LOWER(u.prenom) LIKE '%theo%'
  );
*/

-- 3. IMPORTANT: Marquer toutes les commandes livrées de Théo comme payées
-- Cela empêchera qu'elles soient recalculées dans les gains
-- (Si la colonne livreur_paid_at n'existe pas, exécutez d'abord: scripts/add-delivery-payment-tracking.sql)
UPDATE commandes
SET livreur_paid_at = NOW()
WHERE livreur_id IN (
    SELECT id
    FROM users
    WHERE role = 'delivery'
      AND (
        LOWER(nom) LIKE '%théo%' 
        OR LOWER(prenom) LIKE '%théo%'
        OR LOWER(nom) LIKE '%theo%'
        OR LOWER(prenom) LIKE '%theo%'
      )
)
AND statut = 'livree'
AND livreur_paid_at IS NULL;

-- 4. Remettre le compte à 0 pour Théo
UPDATE delivery_stats
SET 
    total_earnings = 0,
    last_month_earnings = 0,
    updated_at = NOW()
WHERE delivery_id IN (
    SELECT id
    FROM users
    WHERE role = 'delivery'
      AND (
        LOWER(nom) LIKE '%théo%' 
        OR LOWER(prenom) LIKE '%théo%'
        OR LOWER(nom) LIKE '%theo%'
        OR LOWER(prenom) LIKE '%theo%'
      )
);

-- 4. Si aucune entrée n'existe dans delivery_stats, en créer une
-- (Cette partie nécessite de connaître l'ID exact de Théo)
-- Remplacez 'THEO_USER_ID' par l'ID réel trouvé à l'étape 1
/*
INSERT INTO delivery_stats (
    delivery_id,
    total_earnings,
    last_month_earnings,
    total_deliveries,
    average_rating,
    total_distance_km,
    total_time_hours
)
SELECT 
    id,
    0,
    0,
    0,
    0,
    0,
    0
FROM users
WHERE role = 'delivery'
  AND (
    LOWER(nom) LIKE '%théo%' 
    OR LOWER(prenom) LIKE '%théo%'
    OR LOWER(nom) LIKE '%theo%'
    OR LOWER(prenom) LIKE '%theo%'
  )
  AND id NOT IN (SELECT delivery_id FROM delivery_stats)
ON CONFLICT (delivery_id) DO NOTHING;
*/

-- 5. Vérifier le résultat
SELECT 
    ds.total_earnings,
    ds.last_month_earnings,
    ds.total_deliveries,
    u.nom,
    u.prenom,
    u.email
FROM delivery_stats ds
JOIN users u ON u.id = ds.delivery_id
WHERE u.role = 'delivery'
  AND (
    LOWER(u.nom) LIKE '%théo%' 
    OR LOWER(u.prenom) LIKE '%théo%'
    OR LOWER(u.nom) LIKE '%theo%'
    OR LOWER(u.prenom) LIKE '%theo%'
  );

