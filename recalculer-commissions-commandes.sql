-- Script pour recalculer les commissions des commandes existantes avec les nouveaux taux
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier les taux de commission actuels des restaurants
SELECT id, nom, commission_rate 
FROM restaurants 
ORDER BY nom;

-- 2. Recalculer commission_amount et restaurant_payout pour toutes les commandes livrées
-- en fonction du commission_rate actuel du restaurant
UPDATE commandes
SET 
  commission_amount = CASE 
    -- La Bonne Pâte = 0% de commission
    WHEN restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE nom ILIKE '%bonne%pate%' OR nom ILIKE '%bonne%pâte%'
    ) THEN 0
    -- Sinon, utiliser le commission_rate du restaurant (par défaut 20%)
    ELSE ROUND((total * COALESCE(
      (SELECT commission_rate FROM restaurants WHERE id = commandes.restaurant_id),
      20
    ) / 100)::numeric, 2)
  END,
  restaurant_payout = CASE 
    -- La Bonne Pâte = total (pas de commission)
    WHEN restaurant_id IN (
      SELECT id FROM restaurants 
      WHERE nom ILIKE '%bonne%pate%' OR nom ILIKE '%bonne%pâte%'
    ) THEN total
    -- Sinon, total - commission
    ELSE ROUND((total - (total * COALESCE(
      (SELECT commission_rate FROM restaurants WHERE id = commandes.restaurant_id),
      20
    ) / 100))::numeric, 2)
  END,
  commission_rate = COALESCE(
    (SELECT commission_rate FROM restaurants WHERE id = commandes.restaurant_id),
    20
  ),
  updated_at = NOW()
WHERE statut = 'livree'
  AND total > 0;

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

