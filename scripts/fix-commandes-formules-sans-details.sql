-- Script pour identifier et corriger les commandes avec formules sans détails
-- ⚠️ À utiliser avec précaution - vérifier d'abord avec le script de diagnostic

-- 1. Identifier les commandes problématiques
SELECT 
    '🔍 IDENTIFICATION DES COMMANDES PROBLÉMATIQUES' as titre;

-- Commandes du Cévenol sans détails créées récemment
SELECT 
    c.id,
    c.created_at,
    c.statut,
    c.total,
    c.adresse_livraison,
    r.nom as restaurant,
    'Commande sans détails' as probleme
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
  AND NOT EXISTS (
    SELECT 1 FROM details_commande dc WHERE dc.commande_id = c.id
  )
  AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY c.created_at DESC;

-- 2. Vérifier si ces commandes ont des données dans le panier stocké (si disponible)
-- Note: Cette vérification nécessite d'accéder aux logs ou données temporaires

-- 3. SOLUTION MANUELLE RECOMMANDÉE:
-- Pour chaque commande identifiée ci-dessus, il faudrait:
-- 1. Récupérer les données de la commande depuis les logs Stripe (metadata)
-- 2. Recréer les détails_commande manuellement
-- 3. Ou annuler/rembourser la commande si elle est trop ancienne

-- 4. Script de nettoyage pour les commandes vraiment orphelines (à utiliser avec précaution)
/*
-- ⚠️ DÉCOMMENTEZ SEULEMENT APRÈS VÉRIFICATION MANUELLE

-- Marquer les commandes sans détails comme annulées (si elles sont en attente)
UPDATE commandes
SET statut = 'annulee',
    updated_at = NOW()
WHERE id IN (
    SELECT c.id
    FROM commandes c
    INNER JOIN restaurants r ON c.restaurant_id = r.id
    WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
      AND NOT EXISTS (
        SELECT 1 FROM details_commande dc WHERE dc.commande_id = c.id
      )
      AND c.statut = 'en_attente'
      AND c.created_at < NOW() - INTERVAL '24 hours' -- Seulement les anciennes
);
*/

-- 5. Vérification post-correction
SELECT 
    '✅ VÉRIFICATION POST-CORRECTION' as titre;

SELECT 
    COUNT(*) as commandes_sans_details_restantes
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
  AND NOT EXISTS (
    SELECT 1 FROM details_commande dc WHERE dc.commande_id = c.id
  )
  AND c.created_at >= CURRENT_DATE - INTERVAL '7 days';

