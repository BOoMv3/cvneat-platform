-- Vérifier la structure de la table orders
-- À exécuter dans Supabase SQL Editor

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;