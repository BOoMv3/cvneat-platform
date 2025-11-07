import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach((lineRaw) => {
      const line = lineRaw.trim();
      if (!line || line.startsWith('#')) return;
      const [key, ...valueParts] = line.split('=');
      if (!key || valueParts.length === 0) return;
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !SUPABASE_URL) SUPABASE_URL = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY' && !SUPABASE_SERVICE_KEY) SUPABASE_SERVICE_KEY = value;
    });
  } catch (error) {
    console.warn('⚠️  Impossible de lire .env.local :', error.message);
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('NEXT_PUBLIC_SUPABASE_URL :', SUPABASE_URL ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY :', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RESTAURANT_ID = '9521bf01-ce3f-4859-8d36-5294139721ac';
const RESTAURANT_NAME = 'Dolce Vita';

const entrées = [
  { nom: 'Carpaccio', prix: 7.9, category: 'Entrées' },
  { nom: 'Salade de tomates / mozzarella', prix: 6.5, category: 'Entrées' },
  { nom: 'Assiette de charcuterie', prix: 7.5, category: 'Entrées' },
  { nom: 'Salade de gésiers', prix: 6.5, category: 'Entrées' },
  { nom: 'Salade de crudités', prix: 5.5, category: 'Entrées' },
  { nom: 'Salade de chèvre / lardons', prix: 6.5, category: 'Entrées' },
  { nom: 'Salade césar', prix: 6.5, category: 'Entrées' },
  { nom: 'Salade lardons / croûtons', prix: 6.5, category: 'Entrées' },
];

const saladesRepas = [
  { nom: 'Salade crudités', prix: 10.9, category: 'Salades repas' },
  { nom: 'Carpaccio bœuf et burrata', prix: 13.9, category: 'Salades repas' },
  { nom: 'Salade lardons et croûtons', prix: 13.9, category: 'Salades repas' },
  { nom: 'Tomates double mozzarella', prix: 14.9, category: 'Salades repas' },
  { nom: 'Salade fromage rôti', prix: 14.9, category: 'Salades repas' },
  { nom: 'Salade César (poulet & copeaux de parmesan)', prix: 14.9, category: 'Salades repas' },
  { nom: 'Salade chèvre et lardons', prix: 14.9, category: 'Salades repas' },
  { nom: 'Salade burrata, jambon cru et tomates', prix: 16.9, category: 'Salades repas' },
  { nom: 'Salade Italienne (jambon cru, tomates)', prix: 16.9, category: 'Salades repas' },
  { nom: 'Salade canard (magret, foie gras, figues)', prix: 16.9, category: 'Salades repas' },
  { nom: 'Plateau charcuterie et fromages', prix: 15.9, category: 'Salades repas' },
];

const plats = [
  { nom: 'Double Carpaccio', prix: 16.9, category: 'Plats' },
  { nom: 'Pâtes à la bolognaise', prix: 8.9, category: 'Plats' },
  { nom: 'Pâtes à la carbonara', prix: 9.9, category: 'Plats' },
  { nom: 'Pâtes au saumon', prix: 9.9, category: 'Plats' },
  { nom: 'Pâtes au pesto', prix: 9.9, category: 'Plats' },
  { nom: 'Spaghetti alle vongole (palourdes)', prix: 12.9, category: 'Plats' },
  { nom: 'Ravioli 7 fromages', prix: 10.9, category: 'Plats' },
  { nom: 'Ravioli fagottini', prix: 10.9, category: 'Plats' },
  { nom: 'Ravioli chèvre / figue', prix: 10.9, category: 'Plats' },
  { nom: 'Ravioli cèpes / mozzarella', prix: 10.9, category: 'Plats' },
  { nom: 'Pavé de saumon', prix: 13.9, category: 'Plats' },
  { nom: 'Fish & Chips', prix: 11.9, category: 'Plats' },
];

const burgers = [
  { nom: 'Burger original', prix: 11.9, category: 'Burgers' },
  { nom: 'Cheese burger', prix: 12.9, category: 'Burgers' },
  { nom: 'Le Bacon', prix: 12.9, category: 'Burgers' },
  { nom: 'Fish Burger', prix: 11.9, category: 'Burgers' },
  { nom: 'Burger végé', prix: 11.9, category: 'Burgers' },
  { nom: 'Chicken burger', prix: 11.9, category: 'Burgers' },
  { nom: "L'excellent au foie gras", prix: 16.9, category: 'Burgers' },
];

const pizzas = [
  { nom: 'Margarita', prix: 9.9, category: 'Pizzas' },
  { nom: 'Orientale', prix: 11.9, category: 'Pizzas' },
  { nom: 'Reine', prix: 11.9, category: 'Pizzas' },
  { nom: 'Chorizo', prix: 11.9, category: 'Pizzas' },
  { nom: 'Chèvre Miel', prix: 11.9, category: 'Pizzas' },
  { nom: 'Végétarienne', prix: 11.9, category: 'Pizzas' },
  { nom: 'Saumon', prix: 11.9, category: 'Pizzas' },
  { nom: '3 fromages', prix: 11.9, category: 'Pizzas' },
  { nom: 'Poulet curry', prix: 11.9, category: 'Pizzas' },
];

const viandes = [
  { nom: 'Entrecôte', prix: 17.9, category: 'Viandes' },
  { nom: 'Steak haché façon bouchère', prix: 15.9, category: 'Viandes' },
  { nom: 'Bavette', prix: 15.9, category: 'Viandes' },
  { nom: "Côtelette d'agneau", prix: 17.9, category: 'Viandes' },
  { nom: 'Assiette de 3 saucisses', prix: 14.9, category: 'Viandes' },
  { nom: 'Assiette de grillades', prix: 17.9, category: 'Viandes' },
  { nom: 'Demi-magret de canard', prix: 15.9, category: 'Viandes' },
  { nom: 'Magret de canard entier', prix: 18.9, category: 'Viandes' },
  { nom: 'Andouillette', prix: 12.9, category: 'Viandes' },
  { nom: 'Faux-filet', prix: 14.9, category: 'Viandes' },
];

const accompagnements = [
  { nom: 'Accompagnement au choix', prix: 3.5, category: 'Accompagnements', description: 'Frites, pâtes, riz, haricots verts ou ratatouille.' },
];

const menus = [
  { nom: 'Formule Pizza', prix: 14.9, category: 'Formules', description: 'Salade de crudités ou salade lardons / croûtons + pizza au choix.' },
  { nom: 'Formule Plat du jour', prix: 18.9, category: 'Formules', description: 'Assiette de charcuterie ou salade de crudités + plat du jour + dessert (salade de fruits / 2 boules de glace / fondant au chocolat).' },
  { nom: 'Plat du jour', prix: 10.5, category: 'Formules', description: 'Plat du jour selon l\'ardoise.' },
  { nom: 'Menu (entrée + plat ou plat + dessert)', prix: 14.9, category: 'Formules', description: 'Entrée + plat ou plat + dessert autour du plat du jour.' },
  { nom: 'Menu enfant', prix: 7.5, category: 'Formules', description: 'Steak haché ou burger enfant (poulet ou bœuf) ou nuggets + glace 1 boule + jus multifruits.' },
];

const desserts = [
  { nom: 'Profiteroles', prix: 5.9, category: 'Desserts' },
  { nom: 'Crème brûlée', prix: 4.9, category: 'Desserts' },
  { nom: 'Tiramisu', prix: 5.9, category: 'Desserts' },
  { nom: 'Fondant caramel', prix: 5.9, category: 'Desserts' },
  { nom: 'Fondant au chocolat', prix: 5.9, category: 'Desserts' },
  { nom: 'Salade de fruits', prix: 5.5, category: 'Desserts' },
  { nom: 'Café gourmand', prix: 4.9, category: 'Desserts' },
  { nom: '1 boule de glace', prix: 2.0, category: 'Desserts' },
  { nom: '2 boules de glace', prix: 3.5, category: 'Desserts' },
  { nom: '3 boules de glace', prix: 4.5, category: 'Desserts' },
];

const suggestions = [
  { nom: 'Seiche', prix: 18.9, category: 'Suggestions du moment' },
  { nom: 'Côte de bœuf', prix: 22.9, category: 'Suggestions du moment' },
  { nom: 'Burger raclette', prix: 13.9, category: 'Suggestions du moment' },
  { nom: 'Burger 400 g', prix: 18.9, category: 'Suggestions du moment' },
  { nom: 'Burger 600 g', prix: 24.9, category: 'Suggestions du moment' },
  { nom: 'Côte de taureau', prix: 22.9, category: 'Suggestions du moment' },
  { nom: 'Côte de veau', prix: 18.9, category: 'Suggestions du moment' },
  { nom: 'Pâte fraîche sauce truffe', prix: 18.9, category: 'Suggestions du moment' },
  { nom: 'Dorade', prix: 19.9, category: 'Suggestions du moment' },
  { nom: 'Supplément sauce Rossini', prix: 6.0, category: 'Suggestions du moment' },
  { nom: 'Côte de bœuf 1 kg', prix: 45.9, category: 'Suggestions du moment' },
  { nom: "Souris d'agneau", prix: 21.9, category: 'Suggestions du moment' },
];

const menuItems = [
  ...entrées,
  ...saladesRepas,
  ...plats,
  ...burgers,
  ...pizzas,
  ...viandes,
  ...accompagnements,
  ...menus,
  ...desserts,
  ...suggestions,
];

const formatPrice = (value) => Number.parseFloat(value).toFixed(2);

async function upsertMenuItem(item) {
  const payload = {
    restaurant_id: RESTAURANT_ID,
    nom: item.nom,
    description: item.description || null,
    prix: Number.parseFloat(item.prix),
    category: item.category,
    disponible: true,
    image_url: item.image_url || null,
    base_ingredients: item.baseIngredients || [],
    supplements: item.supplements || [],
    is_drink: item.is_drink || false,
    drink_size: item.drink_size || null,
    drink_price_small: item.drink_price_small || null,
    drink_price_medium: item.drink_price_medium || null,
    drink_price_large: item.drink_price_large || null,
  };

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('menus')
    .select('id, prix, category')
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
    console.log(`🔄 ${item.nom} mis à jour (${formatPrice(item.prix)}€)`);
    return 'updated';
  }

  const { error: insertError } = await supabaseAdmin
    .from('menus')
    .insert([payload]);

  if (insertError) {
    throw new Error(`Erreur insertion ${item.nom} : ${insertError.message}`);
  }
  console.log(`✅ ${item.nom} ajouté (${formatPrice(item.prix)}€)`);
  return 'inserted';
}

async function main() {
  console.log('🚀 Ajout / mise à jour du menu pour Dolce Vita');
  console.log(`📍 Restaurant cible : ${RESTAURANT_ID}`);

  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from('restaurants')
    .select('id, nom')
    .eq('id', RESTAURANT_ID)
    .maybeSingle();

  if (restaurantError) {
    console.error('❌ Erreur lors de la recherche du restaurant :', restaurantError.message);
    process.exit(1);
  }

  let restaurantRecord = restaurant;

  if (!restaurantRecord) {
    console.warn('⚠️  Aucun restaurant trouvé avec cet ID. Tentative de recherche par nom (Dolce Vita)…');
    const { data: byName, error: nameError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom')
      .ilike('nom', `%${RESTAURANT_NAME.replace(/\s+/g, '%')}%`);

    if (nameError) {
      console.error('❌ Erreur lors de la recherche par nom :', nameError.message);
      process.exit(1);
    }

    if (!byName || byName.length === 0) {
      console.error('❌ Aucun restaurant trouvé avec un nom contenant "Dolce Vita".');
      process.exit(1);
    }

    if (byName.length > 1) {
      console.warn('⚠️  Plusieurs restaurants trouvés :');
      byName.forEach((r) => console.warn(` - ${r.nom} (${r.id})`));
      console.error('❌ Impossible de continuer sans ID précis.');
      process.exit(1);
    }

    restaurantRecord = byName[0];
    console.warn(`ℹ️  Utilisation de l'ID trouvé : ${restaurantRecord.id}`);
  }

  console.log(`✅ Restaurant trouvé : ${restaurantRecord.nom}`);

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

