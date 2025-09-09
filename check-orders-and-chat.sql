-- Vérifier les commandes et la table chat
-- Exécuter ce script dans Supabase

-- 1. Vérifier les commandes disponibles
SELECT 
  id, 
  customer_name, 
  status, 
  preparation_time, 
  delivery_id, 
  created_at
FROM orders 
WHERE status IN ('ready', 'preparing') 
  AND delivery_id IS NULL
ORDER BY created_at DESC;

-- 2. Vérifier la table chat_messages
SELECT 
  id,
  order_id,
  user_id,
  message,
  created_at
FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Vérifier la structure de la table chat_messages
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
ORDER BY ordinal_position;
