-- SCRIPT POUR AJOUTER LE SUIVI GPS DES LIVREURS

-- 1. Ajouter les colonnes de position GPS et dernière mise à jour dans la table commandes
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS livreur_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS livreur_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS livreur_position_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Créer un index pour optimiser les requêtes sur les commandes en livraison
CREATE INDEX IF NOT EXISTS idx_commandes_livreur_en_livraison 
ON commandes(livreur_id, statut) 
WHERE statut = 'en_livraison';

-- 3. Ajouter des commentaires pour la documentation
COMMENT ON COLUMN commandes.livreur_latitude IS 'Latitude de la position actuelle du livreur';
COMMENT ON COLUMN commandes.livreur_longitude IS 'Longitude de la position actuelle du livreur';
COMMENT ON COLUMN commandes.livreur_position_updated_at IS 'Dernière mise à jour de la position du livreur';

-- 4. Vérifier la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'commandes' 
AND column_name IN ('livreur_latitude', 'livreur_longitude', 'livreur_position_updated_at')
ORDER BY column_name;

