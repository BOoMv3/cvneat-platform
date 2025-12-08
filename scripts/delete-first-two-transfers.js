import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load environment variables from .env.local if not already set
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
      if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.error('Impossible de lire .env.local:', error.message);
    process.exit(1);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Erreur: Les variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ne sont pas définies.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deleteFirstTwoTransfers() {
  console.log('🔄 Suppression des 2 premiers virements...\n');

  try {
    // 1. Récupérer tous les virements triés par date de création
    const { data: transfers, error: fetchError } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des virements:', fetchError);
      return;
    }

    if (!transfers || transfers.length === 0) {
      console.log('ℹ️ Aucun virement trouvé');
      return;
    }

    console.log(`📋 ${transfers.length} virement(s) trouvé(s)\n`);

    // Afficher tous les virements
    transfers.forEach((transfer, index) => {
      console.log(`${index + 1}. ${transfer.restaurant_name} - ${transfer.amount}€ - ${new Date(transfer.created_at).toLocaleString('fr-FR')}`);
    });

    // Prendre les 2 premiers
    const firstTwo = transfers.slice(0, 2);

    if (firstTwo.length === 0) {
      console.log('\nℹ️ Aucun virement à supprimer');
      return;
    }

    console.log('\n🗑️  Virements à supprimer:');
    firstTwo.forEach((transfer, index) => {
      console.log(`   ${index + 1}. ${transfer.restaurant_name} - ${transfer.amount}€ (ID: ${transfer.id})`);
    });

    // Supprimer les 2 premiers
    const idsToDelete = firstTwo.map(t => t.id);
    
    const { error: deleteError } = await supabaseAdmin
      .from('restaurant_transfers')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('❌ Erreur lors de la suppression:', deleteError);
      return;
    }

    console.log('\n✅ 2 premiers virements supprimés avec succès !\n');

    // Vérifier le résultat
    const { data: remainingTransfers } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('*')
      .order('created_at', { ascending: true });

    console.log(`📊 Virements restants: ${remainingTransfers?.length || 0}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

deleteFirstTwoTransfers()
  .then(() => {
    console.log('\n✅ Opération terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

