-- Script SIMPLE pour remettre le compte de Théo (theo@cvneat.fr) à 0€
-- À exécuter dans Supabase SQL Editor - Version sans ON CONFLICT
-- Le CA livreur dans la page admin restera INCHANGÉ

-- ÉTAPE 1: Ajouter la colonne livreur_paid_at si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS livreur_paid_at TIMESTAMP WITH TIME ZONE;

-- ÉTAPE 2: Marquer TOUTES les commandes livrées de Théo comme payées
UPDATE commandes
SET livreur_paid_at = NOW()
WHERE livreur_id = (
    SELECT id FROM users WHERE email = 'theo@cvneat.fr' AND role = 'delivery'
)
AND statut = 'livree'
AND livreur_paid_at IS NULL;

-- ÉTAPE 3: Remettre delivery_stats à 0 pour Théo (ou créer si n'existe pas)
-- D'abord, mettre à jour si l'entrée existe
UPDATE delivery_stats
SET 
    total_earnings = 0,
    last_month_earnings = 0,
    updated_at = NOW()
WHERE delivery_id = (
    SELECT id FROM users WHERE email = 'theo@cvneat.fr' AND role = 'delivery'
);

-- Ensuite, créer l'entrée si elle n'existe pas
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
    u.id,
    0,
    0,
    0,
    0,
    0,
    0
FROM users u
WHERE u.email = 'theo@cvneat.fr'
  AND u.role = 'delivery'
  AND NOT EXISTS (
    SELECT 1 FROM delivery_stats ds WHERE ds.delivery_id = u.id
  );

-- ÉTAPE 4: Vérifier le résultat final
SELECT 
    ds.total_earnings as gains_apres_remise_a_zero,
    ds.last_month_earnings,
    ds.total_deliveries,
    u.nom,
    u.prenom,
    u.email,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL) as commandes_non_payees_restantes,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NOT NULL) as commandes_payees,
    COALESCE(SUM(c.frais_livraison) FILTER (WHERE c.statut = 'livree'), 0) as ca_livreur_total_admin
FROM users u
LEFT JOIN delivery_stats ds ON ds.delivery_id = u.id
LEFT JOIN commandes c ON c.livreur_id = u.id AND c.statut = 'livree'
WHERE u.email = 'theo@cvneat.fr'
  AND u.role = 'delivery'
GROUP BY ds.total_earnings, ds.last_month_earnings, ds.total_deliveries, u.nom, u.prenom, u.email;

