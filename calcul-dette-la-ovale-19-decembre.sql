-- Script pour calculer ce qui était dû au restaurant All'ovale pizza le 19 décembre 2024
-- Restaurant ID: f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824
-- Exclut toutes les transactions après le 19 décembre

-- 1. Vérifier le restaurant
SELECT id, nom FROM restaurants 
WHERE id = 'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824';

-- 2. Vérifier toutes les commandes de ce restaurant (peu importe la date ou le statut)
SELECT 
  COUNT(*) AS total_commandes_toutes_dates,
  COUNT(*) FILTER (WHERE statut = 'livree') AS commandes_livrees_toutes_dates,
  COUNT(*) FILTER (WHERE DATE(created_at) <= '2024-12-19') AS commandes_jusqu_au_19_dec,
  COUNT(*) FILTER (WHERE DATE(created_at) <= '2024-12-19' AND statut = 'livree') AS commandes_livrees_jusqu_au_19_dec,
  MIN(created_at) AS premiere_commande,
  MAX(created_at) AS derniere_commande
FROM commandes
WHERE restaurant_id = 'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824';

-- 2b. Voir toutes les commandes de ce restaurant avec leur statut (limité à 20)
SELECT 
  id,
  DATE(created_at) AS date_commande,
  statut,
  payment_status,
  ROUND(total::numeric, 2) AS total,
  created_at
FROM commandes
WHERE restaurant_id = 'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Calculer le total dû au restaurant jusqu'au 19 décembre 2024 (inclus) - uniquement les livrées
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
  WHERE restaurant_id = 'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824'
  AND DATE(created_at) <= '2024-12-19'
  AND statut = 'livree'  -- Seulement les commandes livrées
  ORDER BY created_at DESC
)
SELECT 
  COUNT(*) AS nombre_commandes,
  ROUND(SUM(total)::numeric, 2) AS total_chiffre_affaires,
  ROUND(SUM(COALESCE(commission_amount, (total * COALESCE(commission_rate, 20) / 100)))::numeric, 2) AS total_commission,
  ROUND(SUM(montant_du_restaurant)::numeric, 2) AS total_du_au_restaurant,
  MIN(created_at) AS premiere_commande,
  MAX(created_at) AS derniere_commande
FROM commandes_19_dec;

-- 4. Détail des commandes jusqu'au 19 décembre
SELECT 
  id,
  DATE(created_at) AS date_commande,
  statut,
  ROUND(total::numeric, 2) AS total,
  ROUND(frais_livraison::numeric, 2) AS frais_livraison,
  commission_rate,
  ROUND(COALESCE(commission_amount, 0)::numeric, 2) AS commission_amount,
  ROUND(COALESCE(restaurant_payout, 0)::numeric, 2) AS restaurant_payout,
  ROUND((CASE 
    WHEN restaurant_payout IS NOT NULL THEN restaurant_payout
    ELSE total - COALESCE(commission_amount, (total * COALESCE(commission_rate, 20) / 100))
  END)::numeric, 2) AS montant_du_restaurant,
  created_at
FROM commandes
WHERE restaurant_id = 'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824'
AND DATE(created_at) <= '2024-12-19'
AND statut = 'livree'
ORDER BY created_at DESC;

