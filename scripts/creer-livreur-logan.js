const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function creerLivreurLogan() {
  console.log('🔧 Création du compte livreur pour logan@cvneat.fr...\n');

  const email = 'logan@cvneat.fr';
  const password = 'logan1642';

  try {
    // 1. Vérifier si l'utilisateur existe déjà
    console.log('📋 Vérification si l\'utilisateur existe déjà...');
    const { data: existingUsers, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (checkError) {
      console.error('❌ Erreur lors de la vérification:', checkError);
      return;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    if (existingUser) {
      console.log(`⚠️  L'utilisateur ${email} existe déjà (ID: ${existingUser.id})`);
      
      // Vérifier si l'utilisateur est déjà dans la table users
      const { data: userData, error: userDataError } = await supabaseAdmin
        .from('users')
        .select('id, email, role')
        .eq('id', existingUser.id)
        .single();

      if (userDataError && userDataError.code !== 'PGRST116') {
        console.error('❌ Erreur lors de la vérification dans users:', userDataError);
        return;
      }

      if (userData) {
        console.log(`   Rôle actuel: ${userData.role}`);
        if (userData.role === 'delivery') {
          console.log('✅ L\'utilisateur est déjà livreur !');
          return;
        } else {
          // Mettre à jour le rôle
          console.log('   Mise à jour du rôle vers "delivery"...');
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ role: 'delivery' })
            .eq('id', existingUser.id);

          if (updateError) {
            console.error('❌ Erreur lors de la mise à jour du rôle:', updateError);
            return;
          }
          console.log('✅ Rôle mis à jour avec succès !');
          return;
        }
      } else {
        // L'utilisateur existe dans auth mais pas dans users, créer l'entrée
        console.log('   Création de l\'entrée dans la table users...');
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: existingUser.id,
            email: email,
            role: 'delivery',
            nom: 'Logan',
            prenom: 'Logan',
            telephone: '0000000000',
            adresse: 'Adresse à préciser',
            code_postal: '00000',
            ville: 'Ville'
          });

        if (insertError) {
          console.error('❌ Erreur lors de la création dans users:', insertError);
          return;
        }
        console.log('✅ Compte livreur créé avec succès !');
        return;
      }
    }

    // 2. Créer l'utilisateur dans auth.users
    console.log('📝 Création de l\'utilisateur dans auth.users...');
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Confirmer l'email automatiquement
      user_metadata: {
        role: 'delivery'
      }
    });

    if (createError) {
      console.error('❌ Erreur lors de la création de l\'utilisateur:', createError);
      return;
    }

    console.log('✅ Utilisateur créé dans auth.users (ID:', newUser.user.id, ')');

    // 3. Créer l'entrée dans la table users
    console.log('📝 Création de l\'entrée dans la table users...');
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUser.user.id,
        email: email,
        role: 'delivery',
        nom: 'Logan',
        prenom: 'Logan',
        telephone: '0000000000',
        adresse: 'Adresse à préciser',
        code_postal: '00000',
        ville: 'Ville'
      });

    if (insertError) {
      console.error('❌ Erreur lors de la création dans users:', insertError);
      // Essayer de supprimer l'utilisateur auth créé
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return;
    }

    console.log('\n✅ Compte livreur créé avec succès !');
    console.log('   Email:', email);
    console.log('   Mot de passe:', password);
    console.log('   Rôle: delivery');
    console.log('   ID:', newUser.user.id);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

creerLivreurLogan();

