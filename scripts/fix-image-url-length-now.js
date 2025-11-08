/**
 * Script pour corriger la taille du champ image_url dans la table menus
 * Change VARCHAR(255) en TEXT pour accepter les images base64 longues
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Charger les variables d'environnement depuis .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Si les variables ne sont pas définies, essayer de les lire depuis .env.local
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    const envVars = {};
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    SUPABASE_URL = SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
    SUPABASE_SERVICE_KEY = SUPABASE_SERVICE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;
  } catch (err) {
    console.error('⚠️  Impossible de lire .env.local:', err.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixImageUrlLength() {
  console.log('🔧 Correction de la taille du champ image_url dans la table menus\n');

  try {
    // Vérifier d'abord le type actuel de la colonne
    const { data: columnInfo, error: checkError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        SELECT 
          data_type,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'menus'
        AND column_name = 'image_url'
      `
    });

    // Utiliser une requête SQL directe via Supabase
    // Note: Supabase n'expose pas directement exec_sql, donc on utilise une approche différente
    // On va utiliser une fonction RPC ou exécuter directement l'ALTER TABLE
    
    // Méthode alternative : utiliser la fonctionnalité de requête SQL de Supabase
    // Si disponible, sinon on utilise directement l'ALTER TABLE
    
    console.log('📝 Exécution de la modification...\n');

    // Exécuter l'ALTER TABLE directement
    // Note: Supabase PostgREST ne supporte pas directement ALTER TABLE
    // Il faut utiliser une fonction SQL ou passer par le SQL Editor
    // Ici, on va vérifier si on peut utiliser une fonction RPC
    
    // Solution : Créer une fonction SQL temporaire ou utiliser directement
    // Pour l'instant, on va afficher les instructions
    
    console.log('⚠️  IMPORTANT: Supabase ne permet pas d\'exécuter ALTER TABLE directement via l\'API JavaScript.');
    console.log('📋 Vous devez exécuter ce script SQL dans Supabase SQL Editor:\n');
    console.log('─'.repeat(60));
    console.log('ALTER TABLE menus');
    console.log('ALTER COLUMN image_url TYPE TEXT;');
    console.log('─'.repeat(60));
    console.log('\n💡 Alternative: Utilisez le fichier fix-image-url-length.sql dans Supabase SQL Editor\n');
    
    // Tentative avec une fonction RPC si elle existe
    try {
      // Créer une fonction temporaire pour exécuter l'ALTER TABLE
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION fix_image_url_length()
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          -- Vérifier le type actuel
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'menus'
            AND column_name = 'image_url'
            AND data_type = 'character varying'
            AND character_maximum_length = 255
          ) THEN
            ALTER TABLE menus
            ALTER COLUMN image_url TYPE TEXT;
            RAISE NOTICE 'Colonne image_url modifiée de VARCHAR(255) à TEXT';
          ELSIF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'menus'
            AND column_name = 'image_url'
            AND data_type = 'text'
          ) THEN
            RAISE NOTICE 'Colonne image_url est déjà de type TEXT';
          END IF;
        END;
        $$;
        
        SELECT fix_image_url_length();
        DROP FUNCTION fix_image_url_length();
      `;

      // Exécuter via une requête RPC personnalisée
      // Note: Cela nécessite que la fonction soit créée dans Supabase d'abord
      console.log('📝 Tentative d\'exécution via fonction SQL...\n');
      
      // On ne peut pas exécuter directement, donc on donne les instructions
      console.log('✅ Instructions pour résoudre le problème:\n');
      console.log('1. Allez dans Supabase Dashboard > SQL Editor');
      console.log('2. Copiez-collez ce code SQL:');
      console.log('');
      console.log('ALTER TABLE menus');
      console.log('ALTER COLUMN image_url TYPE TEXT;');
      console.log('');
      console.log('3. Cliquez sur "Run"');
      console.log('\n✨ Après exécution, vous pourrez enregistrer des images base64 sans limite de taille.\n');
      
    } catch (err) {
      console.error('❌ Erreur:', err.message);
      console.log('\n💡 Solution manuelle: Exécutez le script fix-image-url-length.sql dans Supabase SQL Editor\n');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    console.log('\n💡 Solution: Exécutez manuellement dans Supabase SQL Editor:');
    console.log('   ALTER TABLE menus ALTER COLUMN image_url TYPE TEXT;\n');
  }
}

fixImageUrlLength().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

