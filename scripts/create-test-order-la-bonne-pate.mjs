import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valueParts] = trimmed.split('=');
      if (!key) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    // ignore missing files
  }
}

loadEnvFile(resolve(process.cwd(), '.env'));
loadEnvFile(resolve(process.cwd(), '.env.local'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variables d’environnement Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const RESTAURANT_ID = 'd6725fe6-59ec-413a-b39b-ddb960824999';
const DELIVERY_FEE = 2.5;

function randomSecurityCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatAmount(value) {
  return Math.round(parseFloat(value || 0) * 100) / 100;
}

async function pickSampleUser() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, telephone, nom, prenom')
    .not('telephone', 'is', null)
    .limit(1);

  if (error) {
    console.warn('⚠️ Impossible de récupérer un utilisateur avec téléphone:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ Aucun utilisateur avec téléphone trouvé. La commande sera créée sans user_id.');
    return null;
  }

  return data[0];
}

async function fetchMenuItems() {
  const { data, error } = await supabase
    .from('menus')
    .select('id, nom, prix')
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('disponible', true)
    .limit(5);

  if (error) {
    throw new Error(`Erreur récupération menu: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Aucun plat disponible pour La Bonne Pâte.');
  }

  return data;
}

async function main() {
  console.log('🚀 Création d’une commande test pour La Bonne Pâte...');

  const restaurantRes = await supabase
    .from('restaurants')
    .select('id, nom')
    .eq('id', RESTAURANT_ID)
    .maybeSingle();

  if (restaurantRes.error || !restaurantRes.data) {
    console.error('❌ Restaurant introuvable, vérifie l’ID RESTAURANT_ID.');
    process.exit(1);
  }

  console.log(`✅ Restaurant trouvé: ${restaurantRes.data.nom} (${restaurantRes.data.id})`);

  const menuItems = await fetchMenuItems();
  const selectedItems = menuItems.slice(0, 2).map((item, index) => ({
    ...item,
    quantity: index === 0 ? 2 : 1,
  }));

  const orderSubtotal = selectedItems.reduce(
    (sum, item) => sum + formatAmount(item.prix || 0) * item.quantity,
    0
  );

  const total = formatAmount(orderSubtotal);
  const deliveryFee = formatAmount(DELIVERY_FEE);

  console.log('🛒 Articles sélectionnés:');
  selectedItems.forEach((item) => {
    console.log(`  - ${item.quantity}x ${item.nom} (${item.prix}€)`);
  });
  console.log(`Sous-total: ${total}€ | Frais de livraison: ${deliveryFee}€`);

  const user = await pickSampleUser();
  if (user) {
    console.log(`👤 Commande associée à ${user.prenom || ''} ${user.nom || ''} (${user.email || 'email inconnu'})`);
  }

  const addressLine = '12 Rue du Test';
  const city = 'Ganges';
  const postalCode = '34190';

  const { data: order, error: orderError } = await supabase
    .from('commandes')
    .insert([
      {
        restaurant_id: RESTAURANT_ID,
        user_id: user?.id || null,
        statut: 'en_attente',
        total,
        frais_livraison: deliveryFee,
        adresse_livraison: `${addressLine}, ${postalCode} ${city}`,
        security_code: randomSecurityCode(),
        payment_status: 'paid',
        stripe_payment_intent_id: `pi_test_${Date.now()}`,
        ready_for_delivery: false,
        customer_first_name: user?.prenom || 'Client',
        customer_last_name: user?.nom || 'Test',
        customer_phone: user?.telephone || '+33600000000',
        customer_email: user?.email || 'client@test.com',
      },
    ])
    .select()
    .single();

  if (orderError) {
    console.error('❌ Erreur création commande:', orderError);
    process.exit(1);
  }

  console.log(`✅ Commande créée: ${order.id}`);

  const detailsPayload = selectedItems.map((item) => ({
    commande_id: order.id,
    plat_id: item.id,
    quantite: item.quantity,
    prix_unitaire: formatAmount(item.prix || 0),
    supplements: null,
    customizations: {},
  }));

  const { error: detailsError } = await supabase.from('details_commande').insert(detailsPayload);

  if (detailsError) {
    console.error('❌ Erreur création details_commande:', detailsError);
    process.exit(1);
  }

  console.log('✅ Détails de commande créés.');
  console.log('\nRésumé commande test:');
  console.log(`- Restaurant: ${restaurantRes.data.nom}`);
  console.log(`- Adresse livraison: ${addressLine}, ${postalCode} ${city}`);
  console.log(`- Total articles: ${total}€`);
  console.log(`- Frais de livraison: ${deliveryFee}€`);
  console.log(`- Total client approximatif: ${(total + deliveryFee).toFixed(2)}€`);
  console.log(`- Lien commande: https://app.supabase.com/project/${SUPABASE_URL?.split('https://')[1] || ''}/editor/table/public/commandes`);
}

main().then(() => process.exit(0));

