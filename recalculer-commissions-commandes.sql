-- Script pour recalculer les commissions des commandes existantes avec les nouveaux taux
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier les taux de commission actuels des restaurants
SELECT id, nom, commission_rate 
FROM restaurants 
ORDER BY nom;

-- 2. Recalculer commission_amount et restaurant_payout pour toutes les commandes livrées
-- en fonction du commission_rate actuel du restaurant
WITH restaurant_rates AS (
  SELECT id, commission_rate, 
    CASE 
      WHEN nom ILIKE '%bonne%pate%' OR nom ILIKE '%bonne%pâte%' THEN 0
      ELSE COALESCE(commission_rate, 20)
    END AS effective_rate
  FROM restaurants
)
UPDATE commandes c
SET 
  commission_amount = CASE 
    WHEN rr.effective_rate = 0 THEN 0
    ELSE ROUND((c.total * rr.effective_rate / 100)::numeric, 2)
  END,
  restaurant_payout = CASE 
    WHEN rr.effective_rate = 0 THEN c.total
    ELSE ROUND((c.total - (c.total * rr.effective_rate / 100))::numeric, 2)
  END,
  commission_rate = rr.effective_rate,
  updated_at = NOW()
FROM restaurant_rates rr
WHERE c.restaurant_id = rr.id
  AND c.statut = 'livree'
  AND c.total > 0;

-- 3. Vérifier les résultats pour quelques commandes
SELECT 
  c.id,
  r.nom as restaurant,
  r.commission_rate as taux_restaurant,
  c.total,
  c.commission_amount,
  c.restaurant_payout,
  c.commission_rate as taux_commande,
  CASE 
    WHEN c.commission_amount = 0 AND c.total = c.restaurant_payout THEN 'OK (0%)'
    WHEN ABS(c.commission_amount - (c.total * r.commission_rate / 100)) < 0.01 
      AND ABS(c.restaurant_payout - (c.total - c.commission_amount)) < 0.01 THEN 'OK'
    ELSE 'À vérifier'
  END as verification
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.statut = 'livree'
  AND c.total > 0
ORDER BY c.created_at DESC
LIMIT 20;

-- 4. Résumé par restaurant
SELECT 
  r.nom,
  r.commission_rate as taux,
  COUNT(c.id) as nb_commandes,
  ROUND(SUM(c.total)::numeric, 2) as ca_total,
  ROUND(SUM(c.commission_amount)::numeric, 2) as total_commission,
  ROUND(SUM(c.restaurant_payout)::numeric, 2) as total_du
FROM commandes c
JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.statut = 'livree'
  AND c.total > 0
GROUP BY r.id, r.nom, r.commission_rate
ORDER BY r.nom;

