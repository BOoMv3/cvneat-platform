/**
 * Script pour exécuter la correction de image_url via une fonction RPC
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
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixImageUrl() {
  console.log('🔧 Correction de la taille du champ image_url\n');

  try {
    // D'abord, créer la fonction si elle n'existe pas encore
    console.log('📝 Vérification de la fonction SQL...\n');
    
    // Essayer d'appeler la fonction RPC
    const { data, error } = await supabaseAdmin.rpc('fix_image_url_length_column');

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  La fonction SQL n\'existe pas encore.\n');
        console.log('📋 Vous devez d\'abord créer la fonction dans Supabase SQL Editor:\n');
        console.log('─'.repeat(70));
        const functionSQL = readFileSync(join(__dirname, '..', 'create-fix-image-url-function.sql'), 'utf8');
        console.log(functionSQL);
        console.log('─'.repeat(70));
        console.log('\n💡 Après avoir créé la fonction, réexécutez ce script.\n');
        console.log('OU exécutez directement dans Supabase SQL Editor:\n');
        console.log('ALTER TABLE menus ALTER COLUMN image_url TYPE TEXT;\n');
        return;
      }
      throw error;
    }

    // Afficher le résultat
    if (data) {
      console.log('✅ Résultat:', data.message || 'Opération réussie');
      if (data.previous_type) {
        console.log(`   Type précédent: ${data.previous_type}`);
      }
      if (data.new_type) {
        console.log(`   Nouveau type: ${data.new_type}`);
      }
      if (data.current_type) {
        console.log(`   Type actuel: ${data.current_type}`);
      }
    }

    console.log('\n✨ Correction terminée avec succès!');
    console.log('📸 Vous pouvez maintenant enregistrer des images base64 sans limite de taille.\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Solution alternative: Exécutez directement dans Supabase SQL Editor:\n');
    console.log('ALTER TABLE menus ALTER COLUMN image_url TYPE TEXT;\n');
  }
}

fixImageUrl().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

