-- Vérifier le schéma exact de la table orders en production
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

-- Vérifier les restaurants existants pour avoir un UUID valide
SELECT id, nom FROM restaurants LIMIT 5;
