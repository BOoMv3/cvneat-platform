-- Ajouter la colonne security_code à la table orders
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter la colonne security_code
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS security_code VARCHAR(6);

-- 2. Créer un index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_orders_security_code ON orders(security_code);

-- 3. Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'security_code';

-- 4. Mettre à jour les commandes existantes avec un code de sécurité
UPDATE orders 
SET security_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE security_code IS NULL;

-- 5. Vérifier les codes générés
SELECT id, customer_name, security_code, status 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
