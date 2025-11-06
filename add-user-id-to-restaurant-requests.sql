-- Ajouter la colonne user_id à la table restaurant_requests
-- Cette colonne lie la demande de partenariat à un compte utilisateur CVN'EAT

-- Vérifier si la colonne existe déjà avant de l'ajouter
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'restaurant_requests' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE restaurant_requests
        ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Colonne user_id ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne user_id existe déjà';
    END IF;
END $$;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_restaurant_requests_user_id ON restaurant_requests(user_id);

-- Mettre à jour la politique RLS pour permettre aux utilisateurs de voir leurs propres demandes
DROP POLICY IF EXISTS "Users can view own restaurant requests" ON restaurant_requests;
CREATE POLICY "Users can view own restaurant requests"
    ON restaurant_requests
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Commentaire sur la colonne
COMMENT ON COLUMN restaurant_requests.user_id IS 'ID de l''utilisateur CVN''EAT qui a fait la demande de partenariat';

