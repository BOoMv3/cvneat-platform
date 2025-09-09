-- Vérifier le statut des commandes de test
-- Exécuter ce script dans Supabase

SELECT 
  id, 
  customer_name, 
  status, 
  preparation_time, 
  delivery_id, 
  created_at,
  updated_at
FROM orders 
WHERE id IN (6001, 6002, 7001, 7002)
ORDER BY id;
