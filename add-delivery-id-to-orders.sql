-- Ajouter la colonne delivery_id à la table orders
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne delivery_id si elle n'existe pas
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES auth.users(id);

-- Ajouter un index sur delivery_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_orders_delivery_id ON orders(delivery_id);

-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
