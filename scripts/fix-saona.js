import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // Try to find them in process.env if not in .env.local
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixSaona() {
  console.log('🔍 Recherche du restaurant Saona...');
  
  const { data: restos, error: fetchError } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .ilike('nom', '%saona%');

  if (fetchError) {
    console.error('❌ Erreur:', fetchError.message);
    return;
  }

  if (!restos || restos.length === 0) {
    console.log('⚠️ Aucun restaurant Saona trouvé.');
    return;
  }

  for (const resto of restos) {
    console.log(`\nRestaurant trouvé: ${resto.nom} (ID: ${resto.id})`);
    console.log('Fermé manuellement:', resto.ferme_manuellement);
    console.log('Horaires:', JSON.stringify(resto.horaires, null, 2));

    // Forcer l'ouverture manuelle (ferme_manuellement = false)
    const { error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update({ 
        ferme_manuellement: false,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', resto.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError.message);
    } else {
      console.log('✅ ferme_manuellement mis à false.');
    }
  }
}

fixSaona();

