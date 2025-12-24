-- Script pour calculer ce qui était dû au restaurant all'ovale le 19 décembre 2024
-- Exclut toutes les transactions après le 19 décembre

-- 0. D'abord, lister tous les restaurants pour trouver le bon nom
SELECT id, nom FROM restaurants 
WHERE nom ILIKE '%ovale%' OR nom ILIKE '%pizza%'
ORDER BY nom;

-- 1. Trouver le restaurant All'ovale pizza (décommentez après avoir trouvé le bon ID)
-- SELECT id, nom FROM restaurants 
-- WHERE (nom ILIKE '%ovale%' AND nom ILIKE '%pizza%');

-- 2. Vérifier s'il y a des commandes pour ce restaurant (remplacez RESTAURANT_ID par l'ID trouvé à l'étape 0)
-- SELECT COUNT(*), MIN(created_at), MAX(created_at), COUNT(*) FILTER (WHERE statut = 'livree') as livrees
-- FROM commandes
-- WHERE restaurant_id = 'RESTAURANT_ID'
-- AND DATE(created_at) <= '2024-12-19';

-- 3. Calculer les commandes jusqu'au 19 décembre 2024 (inclus) - uniquement les livrées
-- Le montant dû au restaurant = total - commission
WITH commandes_19_dec AS (
  SELECT 
    id,
    created_at,
    statut,
    total,
    frais_livraison,
    commission_rate,
    commission_amount,
    restaurant_payout,
    -- Si restaurant_payout existe, l'utiliser, sinon calculer
    CASE 
      WHEN restaurant_payout IS NOT NULL THEN restaurant_payout
      ELSE total - COALESCE(commission_amount, (total * COALESCE(commission_rate, 20) / 100))
    END AS montant_du_restaurant
  FROM commandes
  WHERE restaurant_id IN (
    SELECT id FROM restaurants WHERE (nom ILIKE '%ovale%' AND nom ILIKE '%pizza%')
  )
  AND DATE(created_at) <= '2024-12-19'
  AND statut = 'livree'  -- Seulement les commandes livrées
  ORDER BY created_at DESC
)
SELECT 
  COUNT(*) AS nombre_commandes,
  SUM(total) AS total_chiffre_affaires,
  SUM(COALESCE(commission_amount, (total * COALESCE(commission_rate, 20) / 100))) AS total_commission,
  SUM(montant_du_restaurant) AS total_du_au_restaurant,
  MIN(created_at) AS premiere_commande,
  MAX(created_at) AS derniere_commande
FROM commandes_19_dec;

-- 4. Détail des commandes jusqu'au 19 décembre (utilisez l'ID du restaurant trouvé à l'étape 0)
SELECT 
  id,
  DATE(created_at) AS date_commande,
  statut,
  total,
  frais_livraison,
  commission_rate,
  commission_amount,
  restaurant_payout,
  CASE 
    WHEN restaurant_payout IS NOT NULL THEN restaurant_payout
    ELSE total - COALESCE(commission_amount, (total * COALESCE(commission_rate, 20) / 100))
  END AS montant_du_restaurant,
  created_at
FROM commandes
WHERE restaurant_id IN (
  SELECT id FROM restaurants WHERE nom ILIKE '%ovale%' OR nom ILIKE '%oval%'
)
AND DATE(created_at) <= '2024-12-19'
AND statut = 'livree'
ORDER BY created_at DESC;

