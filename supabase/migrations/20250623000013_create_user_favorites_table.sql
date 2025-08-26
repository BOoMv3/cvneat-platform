-- Migration pour créer la table des favoris utilisateur
-- Date: 2025-06-23

-- Créer la table user_favorites
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, restaurant_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_restaurant_id ON user_favorites(restaurant_id);

-- Activer RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view their own favorites"
    ON user_favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
    ON user_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
    ON user_favorites FOR DELETE
    USING (auth.uid() = user_id); 