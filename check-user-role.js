const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase (remplacez par vos vraies clés)
const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseServiceKey = 'VOTRE_NOUVELLE_CLÉ_SERVICE_ROLE'; // Remplacez par votre NOUVELLE clé service_role

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRole(email) {
  console.log(`🔍 Vérification du rôle pour: ${email}`);
  
  try {
    // 1. Vérifier si l'utilisateur existe dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('❌ Erreur récupération utilisateur:', userError);
      return;
    }

    if (!userData) {
      console.log('❌ Utilisateur non trouvé dans la table users');
      return;
    }

    console.log('✅ Utilisateur trouvé dans la table users:');
    console.log('   ID:', userData.id);
    console.log('   Nom:', userData.nom);
    console.log('   Prénom:', userData.prenom);
    console.log('   Email:', userData.email);
    console.log('   Rôle:', userData.role);
    console.log('   Créé le:', userData.created_at);

    // 2. Vérifier si l'utilisateur existe dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur récupération utilisateurs auth:', authError);
      return;
    }

    const authUser = authData.users.find(u => u.email === email);
    
    if (authUser) {
      console.log('✅ Utilisateur trouvé dans Supabase Auth:');
      console.log('   ID Auth:', authUser.id);
      console.log('   Email confirmé:', authUser.email_confirmed_at);
      console.log('   Créé le:', authUser.created_at);
      console.log('   Dernière connexion:', authUser.last_sign_in_at);
    } else {
      console.log('❌ Utilisateur NON trouvé dans Supabase Auth');
    }

    // 3. Vérifier les permissions
    console.log('\n🔐 VÉRIFICATION DES PERMISSIONS:');
    
    if (userData.role === 'admin') {
      console.log('   ✅ Rôle ADMIN - Accès à /admin autorisé');
    } else {
      console.log('   ❌ Rôle NON ADMIN - Accès à /admin refusé');
    }
    
    if (userData.role === 'restaurant') {
      console.log('   ✅ Rôle RESTAURANT - Accès à /partner autorisé');
    } else {
      console.log('   ❌ Rôle NON RESTAURANT - Accès à /partner refusé');
    }
    
    if (userData.role === 'delivery') {
      console.log('   ✅ Rôle LIVREUR - Accès à /delivery autorisé');
    } else {
      console.log('   ❌ Rôle NON LIVREUR - Accès à /delivery refusé');
    }

    // 4. Vérifier la structure de la table users
    console.log('\n📊 STRUCTURE DE LA TABLE USERS:');
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Erreur récupération structure table:', tableError);
    } else if (tableInfo && tableInfo.length > 0) {
      const columns = Object.keys(tableInfo[0]);
      console.log('   Colonnes disponibles:', columns);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Utilisation
const emailToCheck = process.argv[2] || 'admin@cvneat.com';
console.log('🚀 Script de vérification des rôles utilisateur\n');

if (emailToCheck === 'VOTRE_SERVICE_ROLE_KEY') {
  console.log('❌ ERREUR: Vous devez remplacer VOTRE_SERVICE_ROLE_KEY par votre vraie clé service_role');
  console.log('📝 Instructions:');
  console.log('1. Ouvrez create-test-accounts.js');
  console.log('2. Copiez votre clé service_role');
  console.log('3. Remplacez VOTRE_SERVICE_ROLE_KEY dans ce fichier');
  console.log('4. Relancez: node check-user-role.js admin@cvneat.com');
} else {
  checkUserRole(emailToCheck);
} 