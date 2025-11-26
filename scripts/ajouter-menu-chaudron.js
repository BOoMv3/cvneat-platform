/**
 * Script pour ajouter le menu du Chaudron du Roc
 * Prix majorés de 25%
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fonction pour calculer le prix +25% arrondi à 0.50€ près
function prixMajore(prix) {
  const majore = prix * 1.25;
  return Math.round(majore * 2) / 2;
}

async function ajouterMenu() {
  // Récupérer l'ID du restaurant Le Chaudron du Roc
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('nom', 'Le Chaudron du Roc')
    .single();

  if (restError || !restaurant) {
    console.error('Restaurant non trouvé:', restError);
    return;
  }

  const restaurantId = restaurant.id;
  console.log('Restaurant ID:', restaurantId);

  // Supprimer les anciens articles s'il y en a
  await supabase.from('menus').delete().eq('restaurant_id', restaurantId);
  console.log('Anciens articles supprimés');

  const menuItems = [];

  // ============ ENTRÉES ============
  const entrees = [
    { nom: 'Velouté maison de saison', description: 'Velouté fait maison avec les légumes de saison', prix: 5 },
    { nom: 'Planche de Charcuterie', description: 'Sélection de charcuteries', prix: 6 },
    { nom: 'Entrée du Jour', description: 'Entrée du jour selon arrivage', prix: 6 },
  ];

  entrees.forEach(item => {
    menuItems.push({
      restaurant_id: restaurantId,
      nom: item.nom,
      description: item.description,
      prix: prixMajore(item.prix),
      category: 'Entrées',
      disponible: true
    });
  });

  // ============ PLATS ============
  const plats = [
    { nom: 'Poulet Curry Coco', description: 'Poulet mijoté au curry et lait de coco', prix: 14.50 },
    { nom: 'Légumes Curry Coco (Végé)', description: 'Légumes mijotés au curry et lait de coco - Végétarien', prix: 12.50 },
    { nom: 'Tartiflette Reblochon AOP', description: 'Tartiflette traditionnelle au Reblochon AOP', prix: 14 },
    { nom: 'Tartiflette Champignons (Végé)', description: 'Tartiflette végétarienne aux champignons', prix: 13 },
    { nom: 'Suggestion du Jour', description: 'Plat du jour selon arrivage', prix: 12.50 },
    { nom: 'Suggestion du Jour (Végé)', description: 'Version végétarienne du plat du jour', prix: 12 },
  ];

  plats.forEach(item => {
    menuItems.push({
      restaurant_id: restaurantId,
      nom: item.nom,
      description: item.description,
      prix: prixMajore(item.prix),
      category: 'Plats',
      disponible: true
    });
  });

  // ============ GALETTES ============
  const galettes = [
    // Galettes du jour
    { nom: 'Galette Façon Tartiflette', description: 'Galette bretonne façon tartiflette, servie avec salade', prix: 12.50 },
    { nom: 'Galette Façon Raclette', description: 'Galette bretonne façon raclette, servie avec salade', prix: 12.50 },
    { nom: 'Galette Façon Gargantua', description: 'Galette bretonne façon Gargantua, servie avec salade', prix: 12.50 },
    { nom: 'Galette Façon Curry Coco (Végé)', description: 'Galette bretonne façon curry coco végétarienne, servie avec salade', prix: 12.50 },
    // Galettes traditionnelles
    { nom: 'Galette Complète', description: 'Oeuf, jambon, emmental', prix: 10 },
    { nom: 'Galette Peggy', description: 'Oeuf, emmental, oignons, crème aux herbes, poitrine fumée grillée', prix: 11 },
    { nom: 'Galette Cévennes', description: 'Oeuf, emmental, oignons, chèvre fermier, miel', prix: 11 },
    { nom: 'Galette Végétarienne', description: 'Oeuf, oignons, légumes du moment, lentilles', prix: 11 },
    { nom: 'Galette Vegan', description: 'Sauce tomate, champignons, oignons, lentilles, légumes du moment', prix: 12 },
    // Galettes gourmandes
    { nom: 'Galette Guémené', description: 'Andouille de Guémené, oeuf, oignons, crème, camembert de Normandie, rosti de pomme de terre', prix: 15 },
    { nom: 'Galette Fromage', description: 'Oeuf, emmental, cheddar, chèvre fermier, roquefort, camembert', prix: 15 },
  ];

  galettes.forEach(item => {
    menuItems.push({
      restaurant_id: restaurantId,
      nom: item.nom,
      description: item.description,
      prix: prixMajore(item.prix),
      category: 'Galettes',
      disponible: true
    });
  });

  // ============ FROMAGES ============
  const fromages = [
    { nom: 'Trilogie AOP au Choix', description: 'Trois fromages AOP au choix, salade verte et noix', prix: 6 },
  ];

  fromages.forEach(item => {
    menuItems.push({
      restaurant_id: restaurantId,
      nom: item.nom,
      description: item.description,
      prix: prixMajore(item.prix),
      category: 'Fromages',
      disponible: true
    });
  });

  // Insérer tous les articles
  const { data, error } = await supabase
    .from('menus')
    .insert(menuItems);

  if (error) {
    console.error('Erreur lors de l\'insertion:', error);
  } else {
    console.log(`✅ ${menuItems.length} articles ajoutés avec succès!`);
    console.log('\nRécapitulatif des prix avec majoration de 25%:');
    menuItems.forEach(item => {
      console.log(`- ${item.nom}: ${item.prix.toFixed(2)}€ (catégorie: ${item.category})`);
    });
  }
}

ajouterMenu();
