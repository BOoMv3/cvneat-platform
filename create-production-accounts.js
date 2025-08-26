// Script pour créer des comptes de test sur la version déployée
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createProductionTestAccounts() {
  console.log('🌐 Création des comptes de test sur la version déployée...\n');

  const testAccounts = [
    {
      email: 'partenaire.cvneat@gmail.com',
      password: 'partenaire123',
      role: 'partner',
      nom: 'Restaurant Test',
      prenom: 'Partenaire',
      telephone: '0123456789',
      restaurant: {
        nom: 'Le Bistrot Gourmet',
        description: 'Restaurant de cuisine française traditionnelle avec des plats authentiques',
        adresse: '123 Rue de la Gastronomie',
        ville: 'Paris',
        code_postal: '75001',
        telephone: '0123456789',
        email: 'contact@bistrotgourmet.fr',
        horaires: 'Lun-Sam: 11h-23h',
        categorie: 'Française',
        rating: 4.5,
        review_count: 127,
        delivery_time: 25,
        minimum_order: 15.00,
        delivery_fee: 2.50,
        is_active: true
      }
    },
    {
      email: 'client.cvneat@gmail.com',
      password: 'client123',
      role: 'client',
      nom: 'Dupont',
      prenom: 'Marie',
      telephone: '0987654321',
      adresse: '456 Avenue des Clients',
      ville: 'Paris',
      code_postal: '75002'
    },
    {
      email: 'admin.cvneat@gmail.com',
      password: 'admin123',
      role: 'admin',
      nom: 'Administrateur',
      prenom: 'Admin',
      telephone: '0555666777'
    },
    {
      email: 'livreur.cvneat@gmail.com',
      password: 'livreur123',
      role: 'delivery',
      nom: 'Martin',
      prenom: 'Pierre',
      telephone: '0444333222',
      adresse: '789 Rue des Livreurs',
      ville: 'Paris',
      code_postal: '75003'
    }
  ];

  for (const account of testAccounts) {
    try {
      console.log(`📝 Création du compte: ${account.email} (${account.role})`);
      
      // 1. Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password
      });

      if (authError) {
        console.log(`❌ Erreur création auth: ${authError.message}`);
        continue;
      }

      const userId = authData.user.id;
      console.log(`✅ Utilisateur créé avec ID: ${userId}`);

      // 2. Créer le profil utilisateur
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          nom: account.nom,
          prenom: account.prenom,
          telephone: account.telephone,
          role: account.role,
          created_at: new Date().toISOString()
        });

      if (profileError) {
        console.log(`❌ Erreur création profil: ${profileError.message}`);
        continue;
      }

      console.log(`✅ Profil utilisateur créé`);

      // 3. Si c'est un partenaire, créer le restaurant
      if (account.role === 'partner' && account.restaurant) {
        const { error: restaurantError } = await supabase
          .from('restaurants')
          .insert({
            user_id: userId,
            ...account.restaurant,
            created_at: new Date().toISOString()
          });

        if (restaurantError) {
          console.log(`❌ Erreur création restaurant: ${restaurantError.message}`);
        } else {
          console.log(`✅ Restaurant créé: ${account.restaurant.nom}`);
        }
      }

      // 4. Si c'est un client, créer l'adresse
      if (account.role === 'client' && account.adresse) {
        const { error: addressError } = await supabase
          .from('user_addresses')
          .insert({
            user_id: userId,
            address: account.adresse,
            city: account.ville,
            postal_code: account.code_postal,
            is_default: true,
            created_at: new Date().toISOString()
          });

        if (addressError) {
          console.log(`❌ Erreur création adresse: ${addressError.message}`);
        } else {
          console.log(`✅ Adresse client créée`);
        }
      }

      // 5. Si c'est un livreur, créer les stats
      if (account.role === 'delivery') {
        const { error: statsError } = await supabase
          .from('delivery_stats')
          .insert({
            delivery_id: userId,
            total_earnings: 0.00,
            total_deliveries: 0,
            average_rating: 0.00,
            last_month_earnings: 0.00,
            total_distance_km: 0.00,
            total_time_hours: 0.00,
            created_at: new Date().toISOString()
          });

        if (statsError) {
          console.log(`❌ Erreur création stats livreur: ${statsError.message}`);
        } else {
          console.log(`✅ Stats livreur créées`);
        }
      }

      console.log(`🎉 Compte ${account.role} créé avec succès!\n`);

    } catch (error) {
      console.log(`❌ Erreur générale pour ${account.email}: ${error.message}\n`);
    }
  }

  console.log('📋 Récapitulatif des comptes de test:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  testAccounts.forEach(account => {
    console.log(`👤 ${account.role.toUpperCase()}:`);
    console.log(`   Email: ${account.email}`);
    console.log(`   Mot de passe: ${account.password}`);
    console.log(`   Nom: ${account.prenom} ${account.nom}`);
    if (account.role === 'partner') {
      console.log(`   Restaurant: ${account.restaurant.nom}`);
    }
    console.log('');
  });

  console.log('🚀 Instructions de test sur le site déployé:');
  console.log('1. Va sur ton site déployé (URL Vercel)');
  console.log('2. Connecte-toi avec chaque compte sur tes tablettes');
  console.log('3. Teste les fonctionnalités spécifiques à chaque rôle');
  console.log('4. Vérifie que les estimations de temps fonctionnent');
  console.log('5. Teste le processus de commande complet');
  console.log('');
  console.log('🔗 URLs de test:');
  console.log('- Connexion: /login');
  console.log('- Partenaire: /partner/orders');
  console.log('- Admin: /admin');
  console.log('- Livreur: /delivery');
}

// Exécuter le script
createProductionTestAccounts().catch(console.error); 