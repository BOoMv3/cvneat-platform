#!/usr/bin/env node
/**
 * Crée les comptes livreurs Damien + FA et le restaurant Au Bon Coin.
 * Usage: node scripts/creer-comptes-damien-fa-auboncoin.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const HORAIRES_CAFE = {
  lundi: { ouvert: true, plages: [{ ouverture: '11:30', fermeture: '14:30' }, { ouverture: '18:00', fermeture: '21:30' }] },
  mardi: { ouvert: true, plages: [{ ouverture: '11:30', fermeture: '14:30' }, { ouverture: '18:00', fermeture: '21:30' }] },
  mercredi: { ouvert: true, plages: [{ ouverture: '11:30', fermeture: '14:30' }, { ouverture: '18:00', fermeture: '21:30' }] },
  jeudi: { ouvert: true, plages: [{ ouverture: '11:30', fermeture: '14:30' }, { ouverture: '18:00', fermeture: '21:30' }] },
  vendredi: { ouvert: true, plages: [{ ouverture: '11:30', fermeture: '14:30' }, { ouverture: '18:00', fermeture: '22:00' }] },
  samedi: { ouvert: true, plages: [{ ouverture: '11:30', fermeture: '15:00' }, { ouverture: '18:00', fermeture: '22:00' }] },
  dimanche: { ouvert: false, plages: [] },
};

const LIVREURS = [
  {
    prenom: 'Damien',
    nom: 'Livreur',
    email: 'damien.livreur@cvneat.fr',
    password: 'Damien7747!Cvneat',
    telephone: '0774725070',
  },
  {
    prenom: 'FA',
    nom: 'Livreur',
    email: 'fa.livreur@cvneat.fr',
    password: 'Fa6044!Cvneat',
    telephone: '0604414334',
  },
];

const RESTO = {
  nom: 'Au Bon Coin',
  email: 'auboncoin@cvneat.fr',
  password: 'AuBonCoin2026!Cvneat',
  telephone: '0467000000',
  description:
    "Petite restauration & café — pâtes fraîches et cuisine italienne (esprit Pasta e Basta).",
  type_cuisine: 'Italien, Café',
  adresse: '32 cours République',
  ville: 'Ganges',
  code_postal: '34190',
};

async function findAuthUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (hit) return hit;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function ensureDeliveryAccount({ prenom, nom, email, password, telephone }) {
  console.log(`\n🚴 Livreur: ${prenom} (${email})`);
  let authUser = await findAuthUserByEmail(email);

  if (!authUser) {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'delivery', prenom, nom, telephone },
    });
    if (error) throw new Error(`Auth: ${error.message}`);
    authUser = data.user;
    console.log('   ✅ Compte auth créé');
  } else {
    await sb.auth.admin.updateUserById(authUser.id, { password, email_confirm: true });
    console.log('   ℹ️  Auth existant — mot de passe mis à jour');
  }

  const { data: existing } = await sb.from('users').select('id, role').eq('id', authUser.id).maybeSingle();
  const row = {
    id: authUser.id,
    email,
    role: 'delivery',
    prenom,
    nom,
    telephone,
    adresse: 'Ganges',
    code_postal: '34190',
    ville: 'Ganges',
  };

  if (existing) {
    const { error } = await sb.from('users').update(row).eq('id', authUser.id);
    if (error) throw new Error(`users update: ${error.message}`);
    console.log('   ✅ Profil users mis à jour (delivery)');
  } else {
    const { error } = await sb.from('users').insert(row);
    if (error) throw new Error(`users insert: ${error.message}`);
    console.log('   ✅ Profil users créé (delivery)');
  }

  const { data: stats } = await sb.from('delivery_stats').select('id').eq('delivery_id', authUser.id).maybeSingle();
  if (!stats) {
    const { error } = await sb.from('delivery_stats').insert({
      delivery_id: authUser.id,
      total_earnings: 0,
      total_deliveries: 0,
      average_rating: 0,
    });
    if (error && !String(error.message).includes('duplicate')) {
      console.warn('   ⚠️ delivery_stats:', error.message);
    } else {
      console.log('   ✅ delivery_stats initialisé');
    }
  }

  return { id: authUser.id, email, password, telephone };
}

async function ensureRestaurant() {
  console.log(`\n🍽️  Restaurant: ${RESTO.nom}`);
  const { data: existingResto } = await sb.from('restaurants').select('id, user_id').ilike('nom', 'Au Bon Coin').maybeSingle();
  if (existingResto) {
    console.log('   ℹ️  Restaurant déjà présent:', existingResto.id);
    const { data: owner } = await sb.from('users').select('email').eq('id', existingResto.user_id).maybeSingle();
    return { restaurantId: existingResto.id, email: owner?.email || RESTO.email, password: '(inchangé — voir compte existant)' };
  }

  let authUser = await findAuthUserByEmail(RESTO.email);
  if (!authUser) {
    const { data, error } = await sb.auth.admin.createUser({
      email: RESTO.email,
      password: RESTO.password,
      email_confirm: true,
      user_metadata: { role: 'restaurant', nom: RESTO.nom },
    });
    if (error) throw new Error(`Auth resto: ${error.message}`);
    authUser = data.user;
    console.log('   ✅ Compte auth partenaire créé');
  } else {
    await sb.auth.admin.updateUserById(authUser.id, { password: RESTO.password, email_confirm: true });
    console.log('   ℹ️  Auth partenaire existant — MDP mis à jour');
  }

  const userRow = {
    id: authUser.id,
    email: RESTO.email,
    role: 'restaurant',
    nom: RESTO.nom,
    prenom: 'Au',
    telephone: RESTO.telephone,
    adresse: RESTO.adresse,
    code_postal: RESTO.code_postal,
    ville: RESTO.ville,
  };

  const { data: u } = await sb.from('users').select('id').eq('id', authUser.id).maybeSingle();
  if (u) {
    await sb.from('users').update(userRow).eq('id', authUser.id);
  } else {
    const { error } = await sb.from('users').insert(userRow);
    if (error) throw new Error(`users resto: ${error.message}`);
  }
  console.log('   ✅ Profil users (restaurant)');

  const { data: restaurant, error: restoErr } = await sb
    .from('restaurants')
    .insert({
      user_id: authUser.id,
      nom: RESTO.nom,
      description: RESTO.description,
      adresse: RESTO.adresse,
      ville: RESTO.ville,
      code_postal: RESTO.code_postal,
      telephone: RESTO.telephone,
      email: RESTO.email,
      type_cuisine: RESTO.type_cuisine,
      horaires: HORAIRES_CAFE,
      status: 'active',
      frais_livraison: 3,
      ferme_manuellement: false,
      ouvert_manuellement: false,
      image_url:
        'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1200&auto=format&fit=crop',
    })
    .select('id, nom')
    .single();

  if (restoErr) throw new Error(`restaurant: ${restoErr.message}`);
  console.log('   ✅ Restaurant créé:', restaurant.id);

  return {
    restaurantId: restaurant.id,
    email: RESTO.email,
    password: RESTO.password,
    partnerUrl: 'https://www.cvneat.fr/partner',
  };
}

async function main() {
  console.log('=== Création comptes CVN\'EAT ===\n');
  const results = { livreurs: [], restaurant: null };

  for (const l of LIVREURS) {
    results.livreurs.push(await ensureDeliveryAccount(l));
  }
  results.restaurant = await ensureRestaurant();

  console.log('\n========== IDENTIFIANTS (à transmettre) ==========\n');
  for (const l of results.livreurs) {
    console.log(`Livreur ${l.email}`);
    console.log(`  Tél: ${l.telephone}`);
    console.log(`  MDP: ${l.password}`);
    console.log(`  App: https://www.cvneat.fr/delivery/dashboard\n`);
  }
  console.log(`Restaurant ${results.restaurant.email}`);
  console.log(`  MDP: ${results.restaurant.password}`);
  console.log(`  Partenaire: ${results.restaurant.partnerUrl}`);
  console.log(`  ID resto: ${results.restaurant.restaurantId}\n`);
  console.log('(Emails @cvneat.fr — à changer quand le client fournit sa vraie adresse)\n');
}

main().catch((e) => {
  console.error('❌', e.message || e);
  process.exit(1);
});
