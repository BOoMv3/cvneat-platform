-- Créer la table chat_messages (version corrigée)
-- À exécuter dans Supabase SQL Editor

-- 1. Créer la table chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 3. Activer RLS (Row Level Security)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can read chat messages for their orders" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON chat_messages;

-- 5. Créer une politique RLS pour permettre la lecture des messages d'une commande
CREATE POLICY "Users can read chat messages for their orders" ON chat_messages
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders 
      WHERE customer_name = (
        SELECT CONCAT(prenom, ' ', nom) FROM users WHERE id = auth.uid()
      )
    )
  );

-- 6. Créer une politique RLS pour permettre l'écriture des messages
CREATE POLICY "Users can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 7. Vérifier que la table a été créée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
ORDER BY ordinal_position;
