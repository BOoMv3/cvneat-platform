-- Corriger le code de sécurité pour la commande #54
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si la colonne security_code existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'security_code';

-- 2. Voir la commande #54 actuelle
SELECT 
  id,
  customer_name,
  security_code,
  status,
  created_at
FROM orders 
WHERE id = 54;

-- 3. Ajouter un code de sécurité à la commande #54
UPDATE orders 
SET security_code = LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
WHERE id = 54;

-- 4. Vérifier que le code a été ajouté
SELECT 
  id,
  customer_name,
  security_code,
  status
FROM orders 
WHERE id = 54;

-- 5. Si la colonne n'existe pas, l'ajouter d'abord
-- (Décommentez la ligne suivante si nécessaire)
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS security_code VARCHAR(6);
