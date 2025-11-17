-- Script FINAL pour remettre le compte de Théo à 0€
-- Le CA livreur dans la page admin restera INCHANGÉ
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Ajouter la colonne livreur_paid_at si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS livreur_paid_at TIMESTAMP WITH TIME ZONE;

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

-- ÉTAPE 3: Voir les stats actuelles AVANT la remise à zéro
SELECT 
    ds.total_earnings as gains_actuels,
    ds.last_month_earnings,
    ds.total_deliveries,
    u.nom,
    u.prenom,
    u.email,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL) as commandes_non_payees,
    COALESCE(SUM(c.frais_livraison) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL), 0) as montant_non_paye
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

-- ÉTAPE 4: Marquer TOUTES les commandes livrées de Théo comme payées
-- Cela les exclura du calcul des gains personnels, mais elles resteront dans le CA admin
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
    ds.total_earnings as gains_apres_remise_a_zero,
    ds.last_month_earnings,
    ds.total_deliveries,
    u.nom,
    u.prenom,
    u.email,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL) as commandes_non_payees_restantes,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NOT NULL) as commandes_payees,
    -- Le CA total reste inchangé (toutes les commandes livrées)
    COALESCE(SUM(c.frais_livraison) FILTER (WHERE c.statut = 'livree'), 0) as ca_livreur_total_admin
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

