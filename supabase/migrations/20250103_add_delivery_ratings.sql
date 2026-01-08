-- Migration pour ajouter le système de notation des livreurs

-- Table pour stocker les notes des livreurs
CREATE TABLE IF NOT EXISTS delivery_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES commandes(id) ON DELETE CASCADE NOT NULL,
  livreur_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(order_id, user_id) -- Un client ne peut noter qu'une fois par commande
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_livreur_id ON delivery_ratings(livreur_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_order_id ON delivery_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_user_id ON delivery_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_created_at ON delivery_ratings(created_at DESC);

-- Fonction pour calculer la note moyenne d'un livreur
CREATE OR REPLACE FUNCTION get_delivery_rating_stats(livreur_uuid UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_ratings BIGINT,
  rating_5_count BIGINT,
  rating_4_count BIGINT,
  rating_3_count BIGINT,
  rating_2_count BIGINT,
  rating_1_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0) as average_rating,
    COUNT(*)::BIGINT as total_ratings,
    COUNT(*) FILTER (WHERE rating = 5)::BIGINT as rating_5_count,
    COUNT(*) FILTER (WHERE rating = 4)::BIGINT as rating_4_count,
    COUNT(*) FILTER (WHERE rating = 3)::BIGINT as rating_3_count,
    COUNT(*) FILTER (WHERE rating = 2)::BIGINT as rating_2_count,
    COUNT(*) FILTER (WHERE rating = 1)::BIGINT as rating_1_count
  FROM delivery_ratings
  WHERE livreur_id = livreur_uuid;
END;
$$ LANGUAGE plpgsql;

-- Vue pour les statistiques des livreurs (note moyenne + nombre de livraisons)
CREATE OR REPLACE VIEW delivery_leaderboard AS
SELECT 
  u.id as livreur_id,
  u.email,
  u.nom,
  u.prenom,
  COALESCE(ROUND(AVG(dr.rating)::NUMERIC, 2), 0) as average_rating,
  COUNT(dr.id)::BIGINT as total_ratings,
  COUNT(DISTINCT c.id)::BIGINT as total_deliveries,
  MAX(c.created_at) as last_delivery_at
FROM users u
LEFT JOIN commandes c ON c.livreur_id = u.id AND c.statut = 'livree'
LEFT JOIN delivery_ratings dr ON dr.livreur_id = u.id
WHERE u.role = 'delivery'
GROUP BY u.id, u.email, u.nom, u.prenom
HAVING COUNT(DISTINCT c.id) > 0 OR COUNT(dr.id) > 0;

-- Enable RLS
ALTER TABLE delivery_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Les clients peuvent voir leurs propres notes
CREATE POLICY "Users can view their own ratings"
  ON delivery_ratings FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les clients peuvent créer leurs propres notes
CREATE POLICY "Users can create their own ratings"
  ON delivery_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les livreurs peuvent voir leurs propres notes
CREATE POLICY "Delivery drivers can view their own ratings"
  ON delivery_ratings FOR SELECT
  USING (auth.uid() = livreur_id);

-- Policy: Les admins peuvent tout voir (via service role)
-- Note: Les admins utilisent le service role qui bypass RLS

-- Commentaires
COMMENT ON TABLE delivery_ratings IS 'Notes données par les clients aux livreurs après livraison';
COMMENT ON COLUMN delivery_ratings.rating IS 'Note de 1 à 5 étoiles';
COMMENT ON COLUMN delivery_ratings.comment IS 'Commentaire optionnel du client';

