-- Ajouter un code de sécurité à la commande #55
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la commande 55 actuelle
SELECT 
  id,
  customer_name,
  security_code,
  status,
  delivery_id
FROM orders 
WHERE id = 55;

-- 2. Ajouter un code de sécurité à la commande 55
UPDATE orders 
SET security_code = LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE id = 55;

-- 3. Vérifier que le code a été ajouté
SELECT 
  id,
  customer_name,
  security_code,
  status,
  delivery_id
FROM orders 
WHERE id = 55;

-- 4. Si la colonne security_code n'existe pas, l'ajouter d'abord
-- (Décommentez la ligne suivante si nécessaire)
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS security_code VARCHAR(6);
