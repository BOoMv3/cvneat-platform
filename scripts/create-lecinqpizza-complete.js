#!/usr/bin/env node

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
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createLeCinqPizza() {
  try {
    console.log('🍕 Création complète de Le Cinq Pizza...\n');

    const email = 'lecinqpizza@cvneat.fr';
    const password = 'lecinqpizzacvneat2149';
    const nom = 'Le Cinq Pizza Shop';

    // 1. Vérifier si l'utilisateur existe déjà
    console.log('1️⃣ Vérification de l\'utilisateur...');
    let { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === email);

    let userId;
    if (userExists) {
      console.log('   ✅ Utilisateur existe déjà:', userExists.id);
      userId = userExists.id;
    } else {
      console.log('   📝 Création de l\'utilisateur...');
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          nom: nom,
          prenom: '',
          telephone: '04 99 64 00 05'
        }
      });

      if (userError || !newUser) {
        throw new Error(`Erreur création utilisateur: ${userError?.message || 'Inconnu'}`);
      }

      userId = newUser.user.id;
      console.log('   ✅ Utilisateur créé:', userId);

      // Créer l'entrée dans la table users
      const { error: userTableError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          email: email,
          nom: nom,
          prenom: '',
          telephone: '04 99 64 00 05',
          adresse: '5 Avenue Pasteur',
          code_postal: '34190',
          ville: 'Ganges',
          role: 'restaurant'
        });

      if (userTableError) {
        console.warn('   ⚠️ Erreur création entrée users:', userTableError.message);
      } else {
        console.log('   ✅ Entrée users créée');
      }
    }

    // 2. Vérifier si le restaurant existe déjà
    console.log('\n2️⃣ Vérification du restaurant...');
    const { data: existingRestaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let restaurantId;
    if (existingRestaurant) {
      console.log('   ✅ Restaurant existe déjà:', existingRestaurant.id);
      restaurantId = existingRestaurant.id;
    } else {
      console.log('   📝 Création du restaurant...');
      const restaurantInfo = {
        user_id: userId,
        nom: 'Le Cinq Pizza Shop',
        description: 'La véritable Pizza à l\'Italienne, élaborée avec passion par un artisan pizzaïolo à Ganges',
        adresse: '5 Avenue Pasteur',
        code_postal: '34190',
        ville: 'Ganges',
        telephone: '04 99 64 00 05',
        email: email,
        type_cuisine: 'Pizza',
        status: 'active',
        ferme_manuellement: false,
        horaires: {
          "Lundi": "11:00-23:00",
          "Mardi": "11:00-23:00",
          "Mercredi": "11:00-23:00",
          "Jeudi": "11:00-23:00",
          "Vendredi": "11:00-23:00",
          "Samedi": "11:00-23:00",
          "Dimanche": "11:00-23:00"
        },
        categories: ['Pizza', 'Italien', 'Pizzeria'],
        frais_livraison: 2.5,
        commande_min: 15.00,
        temps_livraison: 30,
        image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop'
      };

      const { data: newRestaurant, error: restaurantError } = await supabaseAdmin
        .from('restaurants')
        .insert([restaurantInfo])
        .select()
        .single();

      if (restaurantError || !newRestaurant) {
        throw new Error(`Erreur création restaurant: ${restaurantError?.message || 'Inconnu'}`);
      }

      restaurantId = newRestaurant.id;
      console.log('   ✅ Restaurant créé:', restaurantId);
    }

    // 3. Supprimer les menus existants et créer le nouveau menu
    console.log('\n3️⃣ Création du menu...');
    const { error: deleteError } = await supabaseAdmin
      .from('menus')
      .delete()
      .eq('restaurant_id', restaurantId);

    if (deleteError) {
      console.warn('   ⚠️ Erreur suppression menus existants:', deleteError.message);
    } else {
      console.log('   ✅ Anciens menus supprimés');
    }

    // Pizzas mentionnées sur le site: Royale, Savoyarde, Jardinière, Provençale
    // + pizzas classiques
    const pizzas = [
      { nom: 'Margherita', prix: 8.50, description: 'Tomate, mozzarella, basilic' },
      { nom: 'Reine', prix: 10.50, description: 'Tomate, mozzarella, jambon, champignons' },
      { nom: 'Royale', prix: 11.50, description: 'Tomate, mozzarella, jambon, champignons, olives' },
      { nom: 'Savoyarde', prix: 12.00, description: 'Crème, mozzarella, reblochon, lardons, pommes de terre' },
      { nom: 'Jardinière', prix: 10.00, description: 'Tomate, mozzarella, légumes du soleil' },
      { nom: 'Provençale', prix: 11.00, description: 'Tomate, mozzarella, légumes, herbes de Provence' },
      { nom: '4 Fromages', prix: 11.50, description: 'Tomate, mozzarella, chèvre, roquefort, emmental' },
      { nom: 'Chorizo', prix: 10.50, description: 'Tomate, mozzarella, chorizo' },
      { nom: 'Pepperoni', prix: 10.50, description: 'Tomate, mozzarella, pepperoni' },
      { nom: 'Hawaienne', prix: 11.00, description: 'Tomate, mozzarella, jambon, ananas' },
      { nom: 'Calzone', prix: 12.00, description: 'Tomate, mozzarella, jambon, champignons (fermée)' },
      { nom: 'Orientale', prix: 11.50, description: 'Tomate, mozzarella, merguez, poivrons' },
      { nom: 'Végétarienne', prix: 10.00, description: 'Tomate, mozzarella, légumes frais' },
      { nom: 'Napolitaine', prix: 9.50, description: 'Tomate, mozzarella, anchois, câpres, olives' },
      { nom: 'Spéciale', prix: 12.50, description: 'Tomate, mozzarella, jambon, champignons, œuf, olives' }
    ];

    // Appliquer une marge de 25% pour la commission de la plateforme
    const menuItems = pizzas.map(pizza => ({
      restaurant_id: restaurantId,
      nom: pizza.nom,
      description: pizza.description,
      prix: Math.round((pizza.prix * 1.25) * 100) / 100, // +25% pour commission
      category: 'Pizza',
      disponible: true,
      image_url: null
    }));

    const { data: insertedMenus, error: menuError } = await supabaseAdmin
      .from('menus')
      .insert(menuItems)
      .select();

    if (menuError) {
      throw new Error(`Erreur création menu: ${menuError.message}`);
    }

    console.log(`   ✅ ${insertedMenus.length} pizzas créées`);
    console.log('\n📋 Menu créé:');
    insertedMenus.forEach(menu => {
      console.log(`   - ${menu.nom}: ${menu.prix}€`);
    });

    console.log('\n✅ Création complète terminée !');
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 Mot de passe: ${password}`);
    console.log(`🏪 Restaurant ID: ${restaurantId}`);
    console.log(`\n✅ Le restaurant "Le Cinq Pizza Shop" est maintenant disponible sur la plateforme !`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createLeCinqPizza();

