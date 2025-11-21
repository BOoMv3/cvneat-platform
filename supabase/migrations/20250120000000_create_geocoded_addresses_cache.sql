-- Table de cache pour les coordonnées géocodées
-- Permet de stocker les coordonnées de manière persistante pour éviter les variations
CREATE TABLE IF NOT EXISTS geocoded_addresses_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address_hash VARCHAR(255) UNIQUE NOT NULL, -- Hash de l'adresse normalisée
    address TEXT NOT NULL, -- Adresse originale
    latitude DECIMAL(10, 6) NOT NULL, -- Coordonnée latitude (6 décimales = ~10cm)
    longitude DECIMAL(11, 6) NOT NULL, -- Coordonnée longitude
    postal_code VARCHAR(10), -- Code postal extrait
    city VARCHAR(100), -- Ville extraite
    display_name TEXT, -- Nom d'affichage depuis Nominatim
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Dernière utilisation pour nettoyage
);

-- Index pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_hash ON geocoded_addresses_cache(address_hash);
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_postal_code ON geocoded_addresses_cache(postal_code);
CREATE INDEX IF NOT EXISTS idx_geocoded_addresses_last_used ON geocoded_addresses_cache(last_used_at);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_geocoded_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_used_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_geocoded_addresses_updated_at ON geocoded_addresses_cache;
CREATE TRIGGER update_geocoded_addresses_updated_at
    BEFORE UPDATE ON geocoded_addresses_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_geocoded_addresses_updated_at();

-- Fonction pour nettoyer les anciennes entrées (optionnel, peut être appelée périodiquement)
-- Supprime les entrées non utilisées depuis plus de 90 jours
CREATE OR REPLACE FUNCTION cleanup_old_geocoded_addresses()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM geocoded_addresses_cache
    WHERE last_used_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Commentaires pour documentation
COMMENT ON TABLE geocoded_addresses_cache IS 'Cache persistant des coordonnées géocodées pour éviter les variations et réduire les appels à Nominatim';
COMMENT ON COLUMN geocoded_addresses_cache.address_hash IS 'Hash de l''adresse normalisée (code postal + ville + adresse) pour recherche rapide';
COMMENT ON COLUMN geocoded_addresses_cache.latitude IS 'Latitude arrondie à 6 décimales (~10cm de précision)';
COMMENT ON COLUMN geocoded_addresses_cache.longitude IS 'Longitude arrondie à 6 décimales (~10cm de précision)';



