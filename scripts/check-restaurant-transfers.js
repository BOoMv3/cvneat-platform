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

async function checkTransfers() {
  console.log('🔍 Recherche des virements aux restaurants...\n');

  try {
    // Récupérer tous les virements
    const { data: transfers, error } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('*')
      .order('transfer_date', { ascending: false });

    if (error) {
      console.error('❌ Erreur lors de la récupération des virements:', error);
      return;
    }

    if (!transfers || transfers.length === 0) {
      console.log('⚠️ Aucun virement enregistré dans la base de données.');
      console.log('\n💡 Pour enregistrer des virements, allez sur /admin/payments/transfers');
      return;
    }

    console.log(`✅ ${transfers.length} virement(s) trouvé(s)\n`);
    console.log('='.repeat(80));

    // Filtrer par restaurant
    const bonnePateTransfers = transfers.filter(t => 
      t.restaurant_name && t.restaurant_name.toLowerCase().includes('bonne pâte')
    );
    
    const saonaTeaTransfers = transfers.filter(t => 
      t.restaurant_name && (
        t.restaurant_name.toLowerCase().includes('saona') ||
        t.restaurant_name.toLowerCase().includes('osaona')
      )
    );

    // Afficher les virements pour La Bonne Pâte
    if (bonnePateTransfers.length > 0) {
      console.log('\n🍕 Virements à La Bonne Pâte:');
      console.log('-'.repeat(80));
      bonnePateTransfers.forEach((transfer, index) => {
        console.log(`\n${index + 1}. Virement #${transfer.id?.slice(0, 8)}`);
        console.log(`   Montant: ${parseFloat(transfer.amount || 0).toFixed(2)}€`);
        console.log(`   Date: ${transfer.transfer_date || 'N/A'}`);
        console.log(`   Référence: ${transfer.reference_number || 'Non renseignée'}`);
        if (transfer.period_start && transfer.period_end) {
          console.log(`   Période: ${transfer.period_start} → ${transfer.period_end}`);
        }
        if (transfer.notes) {
          console.log(`   Notes: ${transfer.notes}`);
        }
        console.log(`   Statut: ${transfer.status || 'completed'}`);
      });
      
      const totalBonnePate = bonnePateTransfers
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      console.log(`\n   💰 Total versé: ${totalBonnePate.toFixed(2)}€`);
    } else {
      console.log('\n🍕 La Bonne Pâte: Aucun virement enregistré');
    }

    // Afficher les virements pour O Saona Tea
    if (saonaTeaTransfers.length > 0) {
      console.log('\n\n🍵 Virements à O Saona Tea:');
      console.log('-'.repeat(80));
      saonaTeaTransfers.forEach((transfer, index) => {
        console.log(`\n${index + 1}. Virement #${transfer.id?.slice(0, 8)}`);
        console.log(`   Montant: ${parseFloat(transfer.amount || 0).toFixed(2)}€`);
        console.log(`   Date: ${transfer.transfer_date || 'N/A'}`);
        console.log(`   Référence: ${transfer.reference_number || 'Non renseignée'}`);
        if (transfer.period_start && transfer.period_end) {
          console.log(`   Période: ${transfer.period_start} → ${transfer.period_end}`);
        }
        if (transfer.notes) {
          console.log(`   Notes: ${transfer.notes}`);
        }
        console.log(`   Statut: ${transfer.status || 'completed'}`);
      });
      
      const totalSaonaTea = saonaTeaTransfers
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      console.log(`\n   💰 Total versé: ${totalSaonaTea.toFixed(2)}€`);
    } else {
      console.log('\n🍵 O Saona Tea: Aucun virement enregistré');
    }

    // Afficher tous les autres virements
    const otherTransfers = transfers.filter(t => 
      !bonnePateTransfers.includes(t) && !saonaTeaTransfers.includes(t)
    );

    if (otherTransfers.length > 0) {
      console.log('\n\n📋 Autres virements:');
      console.log('-'.repeat(80));
      otherTransfers.forEach((transfer, index) => {
        console.log(`\n${index + 1}. ${transfer.restaurant_name || 'Restaurant inconnu'}`);
        console.log(`   Montant: ${parseFloat(transfer.amount || 0).toFixed(2)}€`);
        console.log(`   Date: ${transfer.transfer_date || 'N/A'}`);
        console.log(`   Référence: ${transfer.reference_number || 'Non renseignée'}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Résumé total: ${transfers.length} virement(s) enregistré(s)`);
    
    const grandTotal = transfers
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    console.log(`💰 Montant total versé: ${grandTotal.toFixed(2)}€`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkTransfers()
  .then(() => {
    console.log('\n✅ Recherche terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

