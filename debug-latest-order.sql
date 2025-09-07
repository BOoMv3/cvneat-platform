-- Debug de la dernière commande créée
-- À exécuter dans Supabase SQL Editor

-- 1. Voir la dernière commande créée
SELECT 
  id,
  customer_name,
  security_code,
  status,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Voir l'utilisateur client test
SELECT 
  id,
  email,
  nom,
  prenom,
  CONCAT(prenom, ' ', nom) as full_name
FROM users 
WHERE email = 'client.test@example.com';

-- 3. Voir toutes les commandes récentes
SELECT 
  id,
  customer_name,
  status,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Comparer les noms pour la dernière commande
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
WHERE o.id = (SELECT id FROM orders ORDER BY created_at DESC LIMIT 1)
AND u.email = 'client.test@example.com';
