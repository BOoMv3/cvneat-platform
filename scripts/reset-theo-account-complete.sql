-- Script COMPLET pour remettre le compte de Théo à 0
-- Ce script marque toutes ses commandes comme payées ET remet delivery_stats à 0
-- IMPORTANT: Le CA livreur dans la page admin restera INCHANGÉ car il est calculé
--            depuis toutes les commandes livrées, peu importe si elles sont payées ou non
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Vérifier que la colonne livreur_paid_at existe
-- Si elle n'existe pas, exécutez d'abord: scripts/add-delivery-payment-tracking.sql

-- ÉTAPE 2: Trouver Théo
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

-- ÉTAPE 3: Voir les stats actuelles de Théo
SELECT 
    ds.total_earnings,
    ds.last_month_earnings,
    ds.total_deliveries,
    u.nom,
    u.prenom,
    u.email,
    COUNT(c.id) as commandes_livrees_non_payees
FROM delivery_stats ds
JOIN users u ON u.id = ds.delivery_id
LEFT JOIN commandes c ON c.livreur_id = u.id 
    AND c.statut = 'livree' 
    AND c.livreur_paid_at IS NULL
WHERE u.role = 'delivery'
  AND (
    LOWER(u.nom) LIKE '%théo%' 
    OR LOWER(u.prenom) LIKE '%théo%'
    OR LOWER(u.nom) LIKE '%theo%'
    OR LOWER(u.prenom) LIKE '%theo%'
  )
GROUP BY ds.total_earnings, ds.last_month_earnings, ds.total_deliveries, u.nom, u.prenom, u.email;

-- ÉTAPE 4: Marquer TOUTES les commandes livrées de Théo comme payées
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

-- ÉTAPE 5: Remettre delivery_stats à 0 pour Théo
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

-- ÉTAPE 6: Vérifier le résultat final
SELECT 
    ds.total_earnings,
    ds.last_month_earnings,
    ds.total_deliveries,
    u.nom,
    u.prenom,
    u.email,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL) as commandes_non_payees,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NOT NULL) as commandes_payees
FROM delivery_stats ds
JOIN users u ON u.id = ds.delivery_id
LEFT JOIN commandes c ON c.livreur_id = u.id AND c.statut = 'livree'
WHERE u.role = 'delivery'
  AND (
    LOWER(u.nom) LIKE '%théo%' 
    OR LOWER(u.prenom) LIKE '%théo%'
    OR LOWER(u.nom) LIKE '%theo%'
    OR LOWER(u.prenom) LIKE '%theo%'
  )
GROUP BY ds.total_earnings, ds.last_month_earnings, ds.total_deliveries, u.nom, u.prenom, u.email;

