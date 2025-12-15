import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Fonction pour obtenir le client Supabase admin (lazy initialization)
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Variables Supabase manquantes');
  }
  return createClient(url, key);
};

// Fonction de vérification admin
const verifyAdminToken = async (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Token manquant', status: 401 };
    }

    const token = authHeader.split(' ')[1];
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return { error: 'Token invalide', status: 401 };
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role, id')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return { error: 'Accès non autorisé - Admin requis', status: 403 };
    }

    return { userId: userData.id, userRole: userData.role };
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    return { error: 'Erreur d\'authentification', status: 500 };
  }
};

export async function POST(request) {
  try {
    // Vérifier l'authentification admin
    const auth = await verifyAdminToken(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { action } = await request.json();

    if (action === 'fix_image_url_length') {
      // Créer une fonction SQL temporaire pour exécuter l'ALTER TABLE
      // Note: On utilise rpc pour exécuter une fonction PostgreSQL
      
      // D'abord, créer la fonction si elle n'existe pas
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION fix_image_url_length_column()
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          current_type text;
          result jsonb;
        BEGIN
          -- Vérifier le type actuel
          SELECT data_type INTO current_type
          FROM information_schema.columns
          WHERE table_name = 'menus'
          AND column_name = 'image_url';
          
          IF current_type = 'character varying' THEN
            -- Modifier le type
            ALTER TABLE menus
            ALTER COLUMN image_url TYPE TEXT;
            
            result := jsonb_build_object(
              'success', true,
              'message', 'Colonne image_url modifiée de VARCHAR à TEXT avec succès',
              'previous_type', current_type,
              'new_type', 'text'
            );
          ELSIF current_type = 'text' THEN
            result := jsonb_build_object(
              'success', true,
              'message', 'Colonne image_url est déjà de type TEXT',
              'current_type', current_type
            );
          ELSE
            result := jsonb_build_object(
              'success', false,
              'message', 'Type de colonne inattendu: ' || COALESCE(current_type, 'NULL'),
              'current_type', current_type
            );
          END IF;
          
          RETURN result;
        END;
        $$;
      `;

      // Exécuter la création de fonction et l'appel
      try {
        // Créer la fonction via une requête SQL directe
        // Note: Supabase PostgREST ne permet pas d'exécuter directement CREATE FUNCTION
        // Il faut créer la fonction dans Supabase SQL Editor d'abord
        
        // Alternative: Utiliser une connexion PostgreSQL directe si disponible
        // Pour l'instant, on retourne les instructions
        
        return NextResponse.json({
          message: 'Pour exécuter cette modification, vous devez:',
          instructions: [
            '1. Aller dans Supabase Dashboard > SQL Editor',
            '2. Exécuter la commande suivante:',
            '',
            'ALTER TABLE menus',
            'ALTER COLUMN image_url TYPE TEXT;',
            '',
            'OU',
            '',
            'Exécuter le fichier fix-image-url-length.sql'
          ],
          sql_command: 'ALTER TABLE menus ALTER COLUMN image_url TYPE TEXT;',
          note: 'Cette opération nécessite des privilèges administrateur de base de données'
        });

      } catch (error) {
        console.error('Erreur exécution SQL:', error);
        return NextResponse.json({
          error: 'Impossible d\'exécuter la modification automatiquement',
          details: error.message,
          manual_instructions: {
            step1: 'Allez dans Supabase Dashboard > SQL Editor',
            step2: 'Exécutez: ALTER TABLE menus ALTER COLUMN image_url TYPE TEXT;'
          }
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('Erreur route fix-database:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}

