-- Table pour stocker les tokens de notification push (FCM)
-- Utilisée par l'app mobile Capacitor

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par utilisateur
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);

-- Index pour recherche par token
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

-- RLS (Row Level Security)
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent voir et gérer leurs propres tokens
CREATE POLICY "Users can manage their own tokens" ON device_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique: Le service peut tout faire (pour les notifications serveur)
CREATE POLICY "Service role can manage all tokens" ON device_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Commentaire sur la table
COMMENT ON TABLE device_tokens IS 'Tokens FCM pour les notifications push natives (app mobile Capacitor)';

