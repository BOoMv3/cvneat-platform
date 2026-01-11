const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function changerMotDePasseDolceVita() {
  try {
    console.log('🔍 Recherche du restaurant "Dolce Vita"...');

    // 1. Trouver le restaurant
    const { data: restaurants, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, user_id')
      .ilike('nom', '%dolce%vita%');

    if (restaurantError) {
      throw new Error(`Erreur recherche restaurant: ${restaurantError.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      // Lister tous les restaurants pour debug
      const { data: allRestaurants } = await supabaseAdmin
        .from('restaurants')
        .select('id, nom, user_id');
      console.log('\n📋 Tous les restaurants disponibles:');
      allRestaurants?.forEach(r => console.log(`  - ${r.nom} (ID: ${r.id}, user_id: ${r.user_id})`));
      throw new Error('Restaurant "Dolce Vita" non trouvé');
    }

    // Filtrer pour trouver le bon restaurant
    const restaurant = restaurants.find(r =>
      r.nom.toLowerCase().includes('dolce') && r.nom.toLowerCase().includes('vita')
    ) || restaurants[0];

    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})`);

    if (!restaurant.user_id) {
      throw new Error('Restaurant n\'a pas de user_id associé');
    }

    console.log(`📧 User ID associé: ${restaurant.user_id}`);

    // 2. Récupérer l'email de l'utilisateur
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      restaurant.user_id
    );

    if (userError) {
      throw new Error(`Erreur récupération utilisateur: ${userError.message}`);
    }

    if (!userData || !userData.user) {
      throw new Error('Utilisateur non trouvé');
    }

    console.log(`📧 Email associé: ${userData.user.email}`);

    // 3. Changer le mot de passe
    const nouveauMotDePasse = 'vitadolcecvneat0959';
    
    console.log('\n🔐 Changement du mot de passe...');
    
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      restaurant.user_id,
      { password: nouveauMotDePasse }
    );

    if (updateError) {
      throw new Error(`Erreur changement mot de passe: ${updateError.message}`);
    }

    console.log('\n✅ Mot de passe changé avec succès !');
    console.log(`   Restaurant: ${restaurant.nom}`);
    console.log(`   Email: ${userData.user.email}`);
    console.log(`   Nouveau mot de passe: ${nouveauMotDePasse}`);
    console.log('\n⚠️  Le restaurant pourra maintenant se connecter avec ce nouveau mot de passe');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

changerMotDePasseDolceVita();

