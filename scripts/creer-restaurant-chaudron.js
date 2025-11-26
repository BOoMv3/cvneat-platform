/**
 * Script pour créer le restaurant "Le Chaudron du Roc"
 * Email: lechaudron@cvneat.fr
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRestaurant() {
  const email = 'lechaudron@cvneat.fr';
  const restaurantData = {
    nom: 'Le Chaudron du Roc',
    description: 'Restaurant traditionnel avec des plats faits maison',
    adresse: 'Ganges', // À compléter avec l'adresse exacte
    ville: 'Ganges',
    code_postal: '34190',
    telephone: '', // À compléter
    email: email,
    type_cuisine: 'Traditionnel',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2074&auto=format&fit=crop'
  };

  console.log('🔍 Recherche de l\'utilisateur avec email:', email);

  // 1. Chercher l'utilisateur
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, role, nom')
    .eq('email', email);

  if (userError) {
    console.error('❌ Erreur recherche utilisateur:', userError);
    return;
  }

  let userId = null;

  if (users && users.length > 0) {
    userId = users[0].id;
    console.log('✅ Utilisateur trouvé:', users[0]);

    // Mettre à jour le rôle si nécessaire
    if (users[0].role !== 'restaurant') {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'restaurant' })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Erreur mise à jour rôle:', updateError);
      } else {
        console.log('✅ Rôle mis à jour: restaurant');
      }
    }
  } else {
    console.log('⚠️ Utilisateur non trouvé dans la table users');
    
    // Chercher dans Auth
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (!authError && authUsers) {
      const authUser = authUsers.find(u => u.email === email);
      if (authUser) {
        userId = authUser.id;
        console.log('✅ Utilisateur trouvé dans Auth:', authUser.id);

        // Créer l'entrée dans users
        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            nom: 'Le Chaudron du Roc',
            role: 'restaurant'
          });

        if (createUserError) {
          console.error('❌ Erreur création utilisateur:', createUserError);
        } else {
          console.log('✅ Utilisateur créé dans table users');
        }
      }
    }
  }

  if (!userId) {
    console.error('❌ Impossible de trouver ou créer l\'utilisateur');
    return;
  }

  // 2. Vérifier si le restaurant existe déjà
  const { data: existingRestaurant, error: checkError } = await supabase
    .from('restaurants')
    .select('id, nom')
    .eq('user_id', userId);

  if (checkError) {
    console.error('❌ Erreur vérification restaurant:', checkError);
    return;
  }

  if (existingRestaurant && existingRestaurant.length > 0) {
    console.log('⚠️ Restaurant existe déjà:', existingRestaurant[0]);
    return;
  }

  // 3. Créer le restaurant
  console.log('📝 Création du restaurant...');
  
  const { data: newRestaurant, error: createError } = await supabase
    .from('restaurants')
    .insert({
      ...restaurantData,
      user_id: userId
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Erreur création restaurant:', createError);
    console.error('   Code:', createError.code);
    console.error('   Message:', createError.message);
    console.error('   Details:', createError.details);
    return;
  }

  console.log('✅ Restaurant créé avec succès!');
  console.log('   ID:', newRestaurant.id);
  console.log('   Nom:', newRestaurant.nom);
  console.log('   Email:', newRestaurant.email);
}

createRestaurant().catch(console.error);

