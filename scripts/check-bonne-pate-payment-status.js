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

async function checkBonnePatePaymentStatus() {
  console.log('🔄 Vérification du statut de paiement pour La Bonne Pâte...\n');

  try {
    // 1. Trouver le restaurant "La Bonne Pâte"
    const { data: allRestaurants, error: allRestaurantsError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .order('nom', { ascending: true });

    if (allRestaurantsError) {
      console.error('❌ Erreur lors de la récupération des restaurants:', allRestaurantsError);
      return;
    }

    // Chercher le restaurant avec différentes variantes
    const restaurant = allRestaurants?.find(r => {
      const normalized = (r.nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return normalized.includes('bonne') && normalized.includes('pate');
    });

    if (!restaurant) {
      console.error('❌ Restaurant "La Bonne Pâte" non trouvé');
      console.log('\n📋 Restaurants disponibles:');
      allRestaurants?.forEach(r => console.log(`   - ${r.nom}`));
      return;
    }

    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})\n`);

    // 2. Récupérer tous les virements effectués
    const { data: transfers, error: transfersError } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('transfer_date', { ascending: false });

    if (transfersError) {
      console.error('❌ Erreur lors de la récupération des virements:', transfersError);
      return;
    }

    const totalTransfers = transfers?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;
    console.log(`💰 Virements effectués: ${transfers?.length || 0} virement(s)`);
    if (transfers && transfers.length > 0) {
      transfers.forEach((transfer, index) => {
        console.log(`   ${index + 1}. ${transfer.amount}€ - ${new Date(transfer.transfer_date).toLocaleDateString('fr-FR')} - ${transfer.notes || 'Sans note'}`);
      });
    }
    console.log(`   Total versé: ${totalTransfers.toFixed(2)}€\n`);

    // 3. Récupérer toutes les commandes livrées et payées par le client
    const { data: allOrders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, total, created_at, statut, payment_status, restaurant_paid_at')
      .eq('restaurant_id', restaurant.id)
      .eq('statut', 'livree');

    if (ordersError) {
      console.error('❌ Erreur lors de la récupération des commandes:', ordersError);
      return;
    }

    // Filtrer les commandes payées par le client
    const paidOrders = (allOrders || []).filter(order => 
      !order.payment_status || order.payment_status === 'paid'
    );

    const totalRevenue = paidOrders.reduce((sum, order) => {
      return sum + (parseFloat(order.total || 0) || 0);
    }, 0);

    console.log(`📦 Commandes livrées et payées: ${paidOrders.length} commande(s)`);
    console.log(`   Revenus totaux: ${totalRevenue.toFixed(2)}€\n`);

    // 4. Calculer ce qui reste à payer
    // La Bonne Pâte n'a pas de commission (100% des revenus)
    const restaurantPayout = totalRevenue; // Pas de commission
    const remainingToPay = restaurantPayout - totalTransfers;

    console.log('📊 Résumé:');
    console.log(`   Revenus totaux: ${totalRevenue.toFixed(2)}€`);
    console.log(`   Total versé: ${totalTransfers.toFixed(2)}€`);
    console.log(`   Reste à payer: ${remainingToPay.toFixed(2)}€\n`);

    if (remainingToPay > 0) {
      console.log(`⚠️  Il reste ${remainingToPay.toFixed(2)}€ à payer à La Bonne Pâte\n`);
    } else if (remainingToPay < 0) {
      console.log(`ℹ️  Vous avez versé ${Math.abs(remainingToPay).toFixed(2)}€ de plus que nécessaire\n`);
    } else {
      console.log(`✅ Tout est payé !\n`);
    }

    // 5. Afficher les commandes non payées au restaurant
    const unpaidOrders = paidOrders.filter(order => !order.restaurant_paid_at);
    if (unpaidOrders.length > 0) {
      console.log(`📋 Commandes non payées au restaurant (${unpaidOrders.length}):`);
      unpaidOrders.forEach((order, index) => {
        console.log(`   ${index + 1}. Commande ${order.id.slice(0, 8)}... - ${order.total}€ - ${new Date(order.created_at).toLocaleDateString('fr-FR')}`);
      });
      const unpaidTotal = unpaidOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      console.log(`   Total non payé: ${unpaidTotal.toFixed(2)}€\n`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkBonnePatePaymentStatus()
  .then(() => {
    console.log('✅ Opération terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

