-- Vérifier si la colonne security_code existe
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier la structure de la table orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'security_code';

-- 2. Voir les commandes récentes avec leur code de sécurité
SELECT 
  id,
  customer_name,
  security_code,
  status,
  created_at
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Si la colonne n'existe pas, l'ajouter
-- (Décommentez la ligne suivante si nécessaire)
-- ALTER TABLE orders ADD COLUMN security_code VARCHAR(6);
