import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function forceOpenSaona() {
  console.log('🚀 Forçage de l\'ouverture pour "Le O Saona Tea"...');
  
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .update({ 
      ferme_manuellement: false,
      updated_at: new Date().toISOString()
    })
    .ilike('nom', '%saona%')
    .select();

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️ Aucun restaurant trouvé avec "saona" dans le nom.');
    return;
  }

  data.forEach(resto => {
    console.log(`✅ Restaurant "${resto.nom}" mis à jour avec ferme_manuellement = false`);
  });
}

forceOpenSaona();

