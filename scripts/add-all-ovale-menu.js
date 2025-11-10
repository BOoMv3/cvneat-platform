import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if ((!SUPABASE_URL || !SUPABASE_SERVICE_KEY) && existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (!key || valueParts.length === 0) return;
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!SUPABASE_URL && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) SUPABASE_URL = value;
    if (!SUPABASE_SERVICE_KEY && key === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value;
  });
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RESTAURANT_ID = 'f4e1a2ac-5dc9-4ead-9e61-caee1bbb1824';
const RESTAURANT_NAME = "All'Ovale Pizza";
const PRICE_MULTIPLIER = 1.25;

const pizzasBlanches = [
  { nom: 'Campagnarde', prix: 12, description: 'Crème fraiche, oignons, lardons allumettes fumés, mozzarella, emmental, olives' },
  { nom: 'Persillade', prix: 12.5, description: 'Crème fraiche, chèvre, champignons frais, ail, persil, mozzarella, emmental, olives' },
  { nom: 'Kebab', prix: 12, description: 'Crème, viande volaille et/ou veau, oignons, sauce pita blanche, mozzarella, emmental, olives' },
  { nom: '4 Fromages blanche', prix: 13, description: 'Crème fraiche, chèvre, roquefort, mozzarella, emmental, olives' },
  { nom: 'Boloblanche', prix: 13, description: 'Crème fraiche, viande hachée de boeuf, oignons, mozzarella, emmental, olives' },
  { nom: 'Biquette', prix: 13, description: 'Crème fraiche, pélardon, miel d\'acacia, mozzarella, emmental, olives' },
  { nom: 'Raclette', prix: 13, description: 'Crème fraiche, jambon, pomme de terre, raclette, mozzarella, emmental, olives' },
  { nom: 'Savoyarde', prix: 13.5, description: 'Crème fraiche, oignons, lardons allumettes fumés, reblochon, mozzarella, emmental, olives' },
  { nom: 'Roquette', prix: 13.5, description: 'Crème fraiche, pélardon, roquette, pesto, mozzarella, emmental, olives' },
  { nom: 'D\'Aqui', prix: 13.5, description: 'Crème fraiche, truite saumonée fumée de la Buèges, aneth, mozzarella, emmental, olives' },
  { nom: 'Pizza sucrée Choco Nutella', prix: 7, category: 'Desserts', description: 'Pizza sucrée chocolat Nutella' },
];

const pizzasRouges = [
  { nom: 'Margarita', prix: 9, description: 'Tomate, mozzarella, emmental, olives' },
  { nom: 'Jambon', prix: 11, description: 'Tomate, jambon, mozzarella, emmental, olives' },
  { nom: 'Italienne', prix: 11.5, description: 'Tomate, tomates tranchées, basilic, mozzarella, emmental, olives' },
  { nom: 'Reine', prix: 12, description: 'Tomate, jambon, champignons frais, mozzarella, emmental, olives' },
  { nom: 'Napolitaine', prix: 11.5, description: 'Tomate, anchois, câpres, mozzarella, emmental, olives' },
  { nom: 'Roquefort rouge', prix: 12, description: 'Tomate, roquefort, noix, mozzarella, emmental, olives' },
  { nom: 'Végétarienne', prix: 13, description: 'Tomate, tomates tranchées, poivrons, champignons frais, oignons, basilic, mozzarella, emmental, olives' },
  { nom: 'Toscane', prix: 13, description: 'Tomate, chorizo fort, poivron, oignons, mozzarella, emmental, olives' },
  { nom: '4 Fromages rouge', prix: 13, description: 'Tomate, chèvre, roquefort, mozzarella, emmental, olives' },
  { nom: 'Bolognaise', prix: 13, description: 'Tomate, viande hachée de boeuf, oignons, mozzarella, emmental, olives' },
  { nom: 'Fermière', prix: 13, description: 'Tomate, émincés de poulet, curry india, oignons, mozzarella, emmental, olives' },
  { nom: 'Bergère', prix: 14, description: 'Tomate, pélardon, lardons allumettes fumés, oignons, mozzarella, emmental, olives' },
  { nom: 'Cévenole', prix: 14, description: 'Tomate, pélardon, poitrine fumée, noix, mozzarella, emmental, olives' },
  { nom: 'Burger', prix: 14.5, description: 'Tomate, viande hachée de boeuf (ou poulet), pomme de terre, cheddar, sauce burger, mozzarella, emmental, olives' },
  { nom: 'Nîmoise', prix: 14.5, description: 'Tomate, brandade de morue, mozzarella, emmental, olives' },
];

const drinks = [
  { nom: 'Boisson 33cl', prix: 2, category: 'Boissons', description: 'Coca, Orangina, Oasis, Ice-tea, Perrier 33cl' },
  { nom: 'Bière 25cl', prix: 2, category: 'Boissons' },
  { nom: 'Eau minérale 1,5L', prix: 1.5, category: 'Boissons' },
  { nom: 'Vin (rouge, blanc, rosé) 75cl', prix: 9, category: 'Boissons' },
];

const beerAlias = [
  { nom: 'Bières 25cl', prix: 2, category: 'Boissons' }
];

const menuItems = [
  ...pizzasBlanches.map(item => ({ ...item, category: item.category || 'Pizzas blanches' })),
  ...pizzasRouges.map(item => ({ ...item, category: item.category || 'Pizzas rouges' })),
  ...drinks,
  ...beerAlias
];

const formatPrice = (value) => Number.parseFloat(value).toFixed(2);

async function upsertMenuItem(item) {
  const basePrice = Number.parseFloat(item.prix);
  if (!Number.isFinite(basePrice)) {
    throw new Error(`Prix invalide pour ${item.nom}`);
  }

  const priceWithMarkup = Number.parseFloat((basePrice * PRICE_MULTIPLIER).toFixed(2));

  const payload = {
    restaurant_id: RESTAURANT_ID,
    nom: item.nom,
    description: item.description || null,
    prix: priceWithMarkup,
    category: item.category || 'Pizzas',
    disponible: true,
    image_url: item.image_url || null,
    base_ingredients: item.baseIngredients || [],
    supplements: item.supplements || [],
  };

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('menus')
    .select('id')
    .eq('restaurant_id', RESTAURANT_ID)
    .ilike('nom', item.nom)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Erreur lors de la vérification de ${item.nom} : ${fetchError.message}`);
  }

  if (existing) {
    const { error: updateError } = await supabaseAdmin
      .from('menus')
      .update(payload)
      .eq('id', existing.id);

    if (updateError) {
      throw new Error(`Erreur mise à jour ${item.nom} : ${updateError.message}`);
    }
    console.log(`🔄 ${item.nom} mis à jour (${formatPrice(priceWithMarkup)}€)`);
    return 'updated';
  }

  const { error: insertError } = await supabaseAdmin
    .from('menus')
    .insert([payload]);

  if (insertError) {
    throw new Error(`Erreur insertion ${item.nom} : ${insertError.message}`);
  }
  console.log(`✅ ${item.nom} ajouté (${formatPrice(priceWithMarkup)}€)`);
  return 'inserted';
}

async function main() {
  console.log('🚀 Ajout / mise à jour du menu All’Ovale Pizza');
  console.log(`📍 Restaurant cible : ${RESTAURANT_ID}`);

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom')
    .eq('id', RESTAURANT_ID)
    .maybeSingle();

  if (restaurantError || !restaurant) {
    console.error('❌ Restaurant introuvable. Vérifiez l’ID RESTAURANT_ID.');
    process.exit(1);
  }

  console.log(`✅ Restaurant trouvé : ${restaurant.nom}`);

  let inserted = 0;
  let updated = 0;
  const errors = [];

  for (const item of menuItems) {
    try {
      const result = await upsertMenuItem(item);
      if (result === 'inserted') inserted += 1;
      if (result === 'updated') updated += 1;
    } catch (error) {
      console.error(`❌ ${item.nom} : ${error.message}`);
      errors.push({ item: item.nom, message: error.message });
    }
  }

  console.log('\n============================================');
  console.log('📊 Résumé');
  console.log('============================================');
  console.log(`➕ Ajouts : ${inserted}`);
  console.log(`🔄 Mises à jour : ${updated}`);
  console.log(`⚠️ Erreurs : ${errors.length}`);

  if (errors.length) {
    console.log('\nDétails des erreurs :');
    errors.forEach((err) => {
      console.log(` - ${err.item} : ${err.message}`);
    });
  }

  console.log('\n✨ Terminé');
}

main();

