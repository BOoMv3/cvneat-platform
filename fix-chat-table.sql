-- Corriger la table chat_messages
-- Exécuter ce script dans Supabase (onglet SQL Editor)

-- Supprimer la table existante et la recréer avec la bonne structure
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Créer la table chat_messages avec la bonne structure
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les contraintes de clés étrangères
ALTER TABLE chat_messages 
ADD CONSTRAINT fk_chat_messages_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE chat_messages 
ADD CONSTRAINT fk_chat_messages_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Créer les index pour améliorer les performances
CREATE INDEX idx_chat_messages_order_id ON chat_messages(order_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Vérifier que la table a été créée correctement
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
ORDER BY ordinal_position;
