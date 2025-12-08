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

async function resetRestaurantPaidCommands() {
  console.log('🔄 Réinitialisation des commandes marquées comme payées au restaurant...\n');

  try {
    // Récupérer toutes les commandes marquées comme payées au restaurant
    const { data: paidCommands, error: fetchError } = await supabaseAdmin
      .from('commandes')
      .select('id, restaurant_id, total, restaurant_paid_at, restaurants(nom)')
      .not('restaurant_paid_at', 'is', null)
      .order('restaurant_paid_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des commandes:', fetchError);
      return;
    }

    if (!paidCommands || paidCommands.length === 0) {
      console.log('ℹ️ Aucune commande marquée comme payée au restaurant');
      return;
    }

    console.log(`📋 ${paidCommands.length} commande(s) marquée(s) comme payée(s) au restaurant\n`);

    // Afficher les commandes par restaurant
    const byRestaurant = {};
    paidCommands.forEach(cmd => {
      const restaurantName = cmd.restaurants?.nom || 'Inconnu';
      if (!byRestaurant[restaurantName]) {
        byRestaurant[restaurantName] = [];
      }
      byRestaurant[restaurantName].push(cmd);
    });

    Object.keys(byRestaurant).forEach(restaurantName => {
      console.log(`\n🍽️  ${restaurantName}: ${byRestaurant[restaurantName].length} commande(s)`);
      byRestaurant[restaurantName].forEach(cmd => {
        console.log(`   - Commande ${cmd.id.slice(0, 8)}... - ${cmd.total}€ - ${new Date(cmd.restaurant_paid_at).toLocaleString('fr-FR')}`);
      });
    });

    // Demander confirmation
    console.log('\n⚠️  Attention: Cette opération va remettre restaurant_paid_at à NULL pour toutes ces commandes.');
    console.log('   Cela signifie que ces commandes seront à nouveau comptabilisées dans les montants dus.\n');

    // Remettre restaurant_paid_at à NULL pour toutes les commandes
    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        restaurant_paid_at: null
      })
      .not('restaurant_paid_at', 'is', null);

    if (updateError) {
      console.error('❌ Erreur lors de la réinitialisation:', updateError);
      return;
    }

    console.log(`\n✅ ${paidCommands.length} commande(s) réinitialisée(s) avec succès !`);
    console.log('   Les montants dus aux restaurants seront recalculés.\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

resetRestaurantPaidCommands()
  .then(() => {
    console.log('✅ Opération terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

