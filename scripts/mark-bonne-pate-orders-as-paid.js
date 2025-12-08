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

async function markBonnePateOrdersAsPaid() {
  console.log('🔄 Marquage des commandes de La Bonne Pâte comme payées...\n');

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

    const restaurant = allRestaurants?.find(r => {
      const normalized = (r.nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return normalized.includes('bonne') && normalized.includes('pate');
    });

    if (!restaurant) {
      console.error('❌ Restaurant "La Bonne Pâte" non trouvé');
      return;
    }

    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})\n`);

    // 2. Récupérer le virement de 439€
    const { data: transfers, error: transfersError } = await supabaseAdmin
      .from('restaurant_transfers')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('amount', 439)
      .order('transfer_date', { ascending: false })
      .limit(1);

    if (transfersError || !transfers || transfers.length === 0) {
      console.log('ℹ️  Aucun virement de 439€ trouvé. Marquage des commandes jusqu\'à 439€...\n');
    } else {
      const transfer = transfers[0];
      console.log(`💰 Virement trouvé: ${transfer.amount}€ du ${new Date(transfer.transfer_date).toLocaleDateString('fr-FR')}\n`);
    }

    // 3. Récupérer les commandes non payées au restaurant
    const { data: unpaidOrders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, total, created_at, statut, payment_status, restaurant_paid_at')
      .eq('restaurant_id', restaurant.id)
      .eq('statut', 'livree')
      .is('restaurant_paid_at', null)
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('❌ Erreur lors de la récupération des commandes:', ordersError);
      return;
    }

    // Filtrer les commandes payées par le client
    const paidUnpaidOrders = (unpaidOrders || []).filter(order => 
      !order.payment_status || order.payment_status === 'paid'
    );

    if (paidUnpaidOrders.length === 0) {
      console.log('ℹ️  Aucune commande à marquer comme payée\n');
      return;
    }

    console.log(`📦 ${paidUnpaidOrders.length} commande(s) non payée(s) au restaurant\n`);

    // Calculer le total et marquer les commandes jusqu'à 439€
    let totalMarked = 0;
    const ordersToMark = [];
    
    for (const order of paidUnpaidOrders) {
      const orderTotal = parseFloat(order.total || 0);
      if (totalMarked + orderTotal <= 439) {
        ordersToMark.push(order);
        totalMarked += orderTotal;
      } else {
        break;
      }
    }

    if (ordersToMark.length === 0) {
      console.log('ℹ️  Aucune commande à marquer (total déjà supérieur à 439€)\n');
      return;
    }

    console.log(`📋 Commandes à marquer comme payées (${ordersToMark.length}):`);
    ordersToMark.forEach((order, index) => {
      console.log(`   ${index + 1}. Commande ${order.id.slice(0, 8)}... - ${order.total}€ - ${new Date(order.created_at).toLocaleDateString('fr-FR')}`);
    });
    console.log(`   Total: ${totalMarked.toFixed(2)}€\n`);

    // Marquer les commandes comme payées
    const orderIds = ordersToMark.map(o => o.id);
    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        restaurant_paid_at: new Date().toISOString()
      })
      .in('id', orderIds);

    if (updateError) {
      console.error('❌ Erreur lors du marquage:', updateError);
      return;
    }

    console.log(`✅ ${ordersToMark.length} commande(s) marquée(s) comme payée(s) !`);
    console.log(`   Total marqué: ${totalMarked.toFixed(2)}€\n`);

    // Afficher le reste
    const remaining = 439 - totalMarked;
    if (remaining > 0) {
      console.log(`ℹ️  Il reste ${remaining.toFixed(2)}€ non attribués sur le virement de 439€\n`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

markBonnePateOrdersAsPaid()
  .then(() => {
    console.log('✅ Opération terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

