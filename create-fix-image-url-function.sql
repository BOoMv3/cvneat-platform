-- Fonction SQL à créer dans Supabase pour corriger la taille de image_url
-- À exécuter UNE FOIS dans Supabase SQL Editor

CREATE OR REPLACE FUNCTION fix_image_url_length_column()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_type text;
  max_length integer;
  result jsonb;
BEGIN
  -- Vérifier le type actuel de la colonne
  SELECT data_type, character_maximum_length
  INTO current_type, max_length
  FROM information_schema.columns
  WHERE table_name = 'menus'
  AND column_name = 'image_url';
  
  IF current_type = 'character varying' AND max_length = 255 THEN
    -- Modifier le type de VARCHAR(255) à TEXT
    ALTER TABLE menus
    ALTER COLUMN image_url TYPE TEXT;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Colonne image_url modifiée de VARCHAR(255) à TEXT avec succès',
      'previous_type', current_type || '(' || max_length || ')',
      'new_type', 'text'
    );
  ELSIF current_type = 'text' THEN
    result := jsonb_build_object(
      'success', true,
      'message', 'Colonne image_url est déjà de type TEXT',
      'current_type', current_type
    );
  ELSIF current_type IS NULL THEN
    result := jsonb_build_object(
      'success', false,
      'message', 'Colonne image_url non trouvée dans la table menus'
    );
  ELSE
    result := jsonb_build_object(
      'success', false,
      'message', 'Type de colonne inattendu: ' || COALESCE(current_type || '(' || COALESCE(max_length::text, 'NULL') || ')', 'NULL'),
      'current_type', current_type,
      'max_length', max_length
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION fix_image_url_length_column() IS 'Corrige la taille de la colonne image_url de VARCHAR(255) à TEXT pour accepter les images base64';

