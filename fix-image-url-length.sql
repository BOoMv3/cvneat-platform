-- Script SQL pour corriger la taille du champ image_url dans la table menus
-- Le champ est actuellement VARCHAR(255) mais doit être TEXT pour accepter les URLs base64 longues

-- Vérifier et modifier le type de la colonne image_url
DO $$
BEGIN
    -- Vérifier le type actuel de la colonne
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'menus'
        AND column_name = 'image_url'
        AND data_type = 'character varying'
        AND character_maximum_length = 255
    ) THEN
        -- Modifier le type de VARCHAR(255) à TEXT
        ALTER TABLE menus
        ALTER COLUMN image_url TYPE TEXT;
        
        RAISE NOTICE 'Colonne image_url modifiée de VARCHAR(255) à TEXT avec succès';
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'menus'
        AND column_name = 'image_url'
        AND data_type = 'text'
    ) THEN
        RAISE NOTICE 'Colonne image_url est déjà de type TEXT';
    ELSE
        RAISE NOTICE 'Colonne image_url non trouvée dans la table menus';
    END IF;
END $$;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN menus.image_url IS 'URL de l''image du plat (peut être une URL HTTP ou une chaîne base64 data:image)';

