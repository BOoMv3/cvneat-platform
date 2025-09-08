-- Debug de l'erreur de chat
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si la table chat_messages existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'chat_messages';

-- 2. Vérifier la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
ORDER BY ordinal_position;

-- 3. Vérifier les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'chat_messages';

-- 4. Tester un insert simple (remplacez les IDs par de vrais)
-- INSERT INTO chat_messages (order_id, user_id, message) 
-- VALUES (55, 'votre-user-id-ici', 'Test message');

-- 5. Voir les messages existants
SELECT 
  cm.*,
  u.nom,
  u.prenom
FROM chat_messages cm
LEFT JOIN users u ON cm.user_id = u.id
ORDER BY cm.created_at DESC
LIMIT 5;
