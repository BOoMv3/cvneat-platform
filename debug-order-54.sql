-- Debug de la commande #54 et de l'utilisateur client test
-- À exécuter dans Supabase SQL Editor

-- 1. Voir la commande #54
SELECT 
  id,
  customer_name,
  security_code,
  status,
  created_at
FROM orders 
WHERE id = 54;

-- 2. Voir l'utilisateur client test
SELECT 
  id,
  email,
  nom,
  prenom,
  CONCAT(prenom, ' ', nom) as full_name
FROM users 
WHERE email = 'client.test@example.com';

-- 3. Comparer les noms
SELECT 
  o.id as order_id,
  o.customer_name as order_customer,
  u.nom as user_nom,
  u.prenom as user_prenom,
  CONCAT(u.prenom, ' ', u.nom) as user_full_name,
  CASE 
    WHEN o.customer_name = CONCAT(u.prenom, ' ', u.nom) THEN 'MATCH'
    ELSE 'NO MATCH'
  END as name_match
FROM orders o
CROSS JOIN users u
WHERE o.id = 54 
AND u.email = 'client.test@example.com';

-- 4. Voir toutes les commandes avec customer_name
SELECT 
  id,
  customer_name,
  status
FROM orders 
ORDER BY id DESC 
LIMIT 10;
