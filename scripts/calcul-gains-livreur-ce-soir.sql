-- Script pour calculer les gains du livreur avec les commandes de ce soir
-- À exécuter dans Supabase SQL Editor

-- Vue d'ensemble des commandes de ce soir
SELECT 
    '📊 RÉSUMÉ DES COMMANDES DE CE SOIR' as titre;

SELECT 
    COUNT(*) as nombre_commandes_total,
    COUNT(*) FILTER (WHERE statut = 'livree') as commandes_livrees,
    COUNT(*) FILTER (WHERE statut = 'en_livraison') as en_cours_livraison,
    COUNT(*) FILTER (WHERE statut = 'annulee') as commandes_annulees,
    COUNT(*) FILTER (WHERE statut IN ('en_attente', 'acceptee', 'en_preparation', 'pret_a_livrer')) as commandes_en_preparation
FROM commandes
WHERE DATE(created_at) = CURRENT_DATE;

-- Détails des commandes livrées ce soir
SELECT 
    '📦 DÉTAILS DES COMMANDES LIVRÉES' as titre;

SELECT 
    c.id,
    c.created_at as heure_commande,
    c.updated_at as heure_livraison,
    c.statut,
    c.total as montant_commande,
    c.frais_livraison,
    COALESCE(c.frais_livraison * 0.80, 0) as gain_livreur_estimé,
    c.adresse_livraison,
    r.nom as restaurant,
    u.prenom || ' ' || u.nom as livreur
FROM commandes c
LEFT JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN users u ON c.livreur_id = u.id
WHERE DATE(c.created_at) = CURRENT_DATE
  AND c.statut = 'livree'
ORDER BY c.updated_at DESC;

-- Calcul des gains par livreur
SELECT 
    '💰 GAINS PAR LIVREUR CE SOIR' as titre;

SELECT 
    u.id as livreur_id,
    u.prenom || ' ' || u.nom as nom_livreur,
    u.telephone,
    COUNT(c.id) as nombre_livraisons,
    SUM(c.frais_livraison) as total_frais_livraison,
    -- Le livreur gagne généralement 80% des frais de livraison
    ROUND(SUM(c.frais_livraison) * 0.80, 2) as gains_estimés_80_pourcent,
    -- Ou 100% selon la politique de votre plateforme
    ROUND(SUM(c.frais_livraison), 2) as gains_si_100_pourcent,
    ROUND(AVG(c.frais_livraison), 2) as frais_moyen_par_livraison,
    MIN(c.created_at) as premiere_livraison,
    MAX(c.updated_at) as derniere_livraison
FROM commandes c
INNER JOIN users u ON c.livreur_id = u.id
WHERE DATE(c.created_at) = CURRENT_DATE
  AND c.statut = 'livree'
  AND u.role = 'livreur'
GROUP BY u.id, u.prenom, u.nom, u.telephone
ORDER BY nombre_livraisons DESC;

-- Calcul global tous livreurs confondus
SELECT 
    '💵 GAINS TOTAUX TOUS LIVREURS' as titre;

SELECT 
    COUNT(DISTINCT c.livreur_id) as nombre_livreurs_actifs,
    COUNT(c.id) as total_livraisons,
    SUM(c.frais_livraison) as total_frais_livraison,
    ROUND(SUM(c.frais_livraison) * 0.80, 2) as total_gains_livreurs_80_pourcent,
    ROUND(SUM(c.frais_livraison), 2) as total_gains_si_100_pourcent,
    ROUND(AVG(c.frais_livraison), 2) as frais_moyen_livraison,
    ROUND(SUM(c.total), 2) as chiffre_affaires_total
FROM commandes c
WHERE DATE(c.created_at) = CURRENT_DATE
  AND c.statut = 'livree'
  AND c.livreur_id IS NOT NULL;

-- Détail par tranche horaire
SELECT 
    '⏰ RÉPARTITION PAR HEURE' as titre;

SELECT 
    EXTRACT(HOUR FROM c.created_at) as heure,
    COUNT(c.id) as nombre_livraisons,
    SUM(c.frais_livraison) as frais_livraison_total,
    ROUND(SUM(c.frais_livraison) * 0.80, 2) as gains_livreurs_heure,
    ROUND(AVG(c.frais_livraison), 2) as frais_moyen
FROM commandes c
WHERE DATE(c.created_at) = CURRENT_DATE
  AND c.statut = 'livree'
  AND c.livreur_id IS NOT NULL
GROUP BY EXTRACT(HOUR FROM c.created_at)
ORDER BY heure DESC;

-- Commandes en attente de livraison (potentiel de gains)
SELECT 
    '🚀 COMMANDES EN ATTENTE DE LIVRAISON (Potentiel)' as titre;

SELECT 
    COUNT(*) as commandes_en_attente,
    SUM(frais_livraison) as frais_livraison_potentiels,
    ROUND(SUM(frais_livraison) * 0.80, 2) as gains_potentiels_80_pourcent
FROM commandes
WHERE DATE(created_at) = CURRENT_DATE
  AND statut IN ('pret_a_livrer', 'en_livraison')
  AND livreur_id IS NOT NULL;

-- 📋 NOTES SUR LE CALCUL DES GAINS
/*
🔹 POLITIQUE DE RÉMUNÉRATION STANDARD :
   - Option 1: Livreur garde 80% des frais de livraison (plateforme 20%)
   - Option 2: Livreur garde 100% des frais de livraison
   - Option 3: Taux fixe par livraison (ex: 3-5€)

🔹 CE SCRIPT CALCULE :
   ✅ Nombre de livraisons effectuées
   ✅ Total des frais de livraison
   ✅ Gains estimés (80% et 100%)
   ✅ Moyenne par livraison
   ✅ Répartition par heure

🔹 POUR PERSONNALISER :
   - Modifiez le pourcentage (0.80) selon votre politique
   - Ajoutez des bonus (ex: +1€ par livraison de nuit)
   - Ajoutez des pénalités (annulations, retards)

🔹 EXEMPLE DE CALCUL :
   Si un livreur a fait 10 livraisons à 3.50€ :
   - Total frais : 10 × 3.50€ = 35€
   - Gains 80% : 35€ × 0.80 = 28€
   - Gains 100% : 35€
*/

