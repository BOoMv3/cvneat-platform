-- Debug de la logique de l'API des alertes
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier le delivery_id du token (remplacez par le bon)
-- Pour livreur1@cvneat.com, c'est : 570c76ba-b097-4380-9fc0-244b366e24c2
WITH delivery_id AS (
  SELECT '570c76ba-b097-4380-9fc0-244b366e24c2'::uuid as id
),
-- 2. Récupérer les commandes en préparation pour ce livreur
preparing_orders AS (
  SELECT 
    o.*,
    r.nom as restaurant_nom,
    r.adresse as restaurant_adresse,
    r.telephone as restaurant_telephone
  FROM orders o
  LEFT JOIN restaurants r ON o.restaurant_id = r.id
  CROSS JOIN delivery_id d
  WHERE o.status = 'preparing'
    AND o.delivery_id = d.id
    AND o.preparation_time IS NOT NULL
),
-- 3. Calculer les temps restants
orders_with_time AS (
  SELECT 
    *,
    EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
    (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
  FROM preparing_orders
),
-- 4. Filtrer les commandes qui devraient déclencher une alerte
alert_orders AS (
  SELECT 
    id,
    customer_name,
    restaurant_nom,
    restaurant_adresse,
    preparation_time,
    minutes_remaining,
    total_amount,
    security_code,
    items
  FROM orders_with_time
  WHERE minutes_remaining <= 5 
    AND minutes_remaining > 0
)
-- 5. Résultat final
SELECT 
  'Résultat de l\'API' as info,
  COUNT(*) as alerts_count,
  json_agg(
    json_build_object(
      'order_id', id,
      'customer_name', customer_name,
      'restaurant_name', restaurant_nom,
      'restaurant_address', restaurant_adresse,
      'preparation_time', preparation_time,
      'time_remaining_minutes', CEIL(minutes_remaining),
      'total_price', total_amount,
      'security_code', security_code,
      'items', items
    )
  ) as alerts
FROM alert_orders;

-- 6. Debug : Vérifier toutes les commandes en préparation
SELECT 
  'Debug: Toutes les commandes en préparation' as info,
  id,
  customer_name,
  status,
  delivery_id,
  preparation_time,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_elapsed,
  (preparation_time - EXTRACT(EPOCH FROM (NOW() - updated_at))/60) as minutes_remaining
FROM orders 
WHERE status = 'preparing' 
  AND preparation_time IS NOT NULL
ORDER BY id DESC;