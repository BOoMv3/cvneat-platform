// Script pour créer des comptes de test CVN'Eat
const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase (remplacez par vos vraies clés)
const supabaseUrl = 'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
const supabaseServiceKey = 'VOTRE_NOUVELLE_CLÉ_SERVICE_ROLE' // Remplacez par votre NOUVELLE cléHMd6J_N9e7Ne3XBSyZQ'; // Votre vraie clé service_role

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestAccounts() {
  console.log('🚀 Création des comptes de test...');

  try {
    // 1. Créer un compte ADMIN
    console.log('\n📝 Création du compte ADMIN...');
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@cvneat.com',
      password: 'admin123',
      email_confirm: true
    });

    if (adminError) {
      console.error('❌ Erreur création admin:', adminError);
    } else {
      // Créer le profil utilisateur admin
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: adminUser.user.id,
          nom: 'Admin',
          prenom: 'CVN\'EAT',
          email: 'admin@cvneat.com',
          telephone: '0123456789',
          adresse: '123 Rue Admin',
          code_postal: '75000',
          ville: 'Paris',
          role: 'admin'
        });

      if (profileError) {
        console.error('❌ Erreur profil admin:', profileError);
      } else {
        console.log('✅ Compte ADMIN créé avec succès !');
        console.log('   Email: admin@cvneat.com');
        console.log('   Mot de passe: admin123');
      }
    }

    // 2. Créer un compte PARTENAIRE (RESTAURANT)
    console.log('\n🍕 Création du compte PARTENAIRE...');
    const { data: partnerUser, error: partnerError } = await supabase.auth.admin.createUser({
      email: 'restaurant@cvneat.com',
      password: 'restaurant123',
      email_confirm: true
    });

    if (partnerError) {
      console.error('❌ Erreur création partenaire:', partnerError);
    } else {
      // Créer le profil utilisateur partenaire
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: partnerUser.user.id,
          nom: 'Restaurant',
          prenom: 'Test',
          email: 'restaurant@cvneat.com',
          telephone: '0123456790',
          adresse: '456 Rue Restaurant',
          code_postal: '75001',
          ville: 'Paris',
          role: 'restaurant'
        });

      if (profileError) {
        console.error('❌ Erreur profil partenaire:', profileError);
      } else {
        // Créer le restaurant
        const { error: restaurantError } = await supabase
          .from('restaurants')
          .insert({
            user_id: partnerUser.user.id,
            nom: 'Restaurant Test',
            description: 'Un restaurant de test pour CVN\'EAT',
            type_cuisine: 'Français',
            telephone: '0123456790',
            adresse: '456 Rue Restaurant',
            code_postal: '75001',
            ville: 'Paris',
            email: 'restaurant@cvneat.com',
            status: 'active',
            horaires: {
              lundi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
              mardi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
              mercredi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
              jeudi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
              vendredi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
              samedi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
              dimanche: { ouvert: false }
            }
          });

        if (restaurantError) {
          console.error('❌ Erreur création restaurant:', restaurantError);
        } else {
          console.log('✅ Compte PARTENAIRE créé avec succès !');
          console.log('   Email: restaurant@cvneat.com');
          console.log('   Mot de passe: restaurant123');
        }
      }
    }

    // 3. Créer un compte LIVREUR
    console.log('\n🚚 Création du compte LIVREUR...');
    const { data: deliveryUser, error: deliveryError } = await supabase.auth.admin.createUser({
      email: 'livreur@cvneat.com',
      password: 'livreur123',
      email_confirm: true
    });

    if (deliveryError) {
      console.error('❌ Erreur création livreur:', deliveryError);
    } else {
      // Créer le profil utilisateur livreur
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: deliveryUser.user.id,
          nom: 'Livreur',
          prenom: 'Test',
          email: 'livreur@cvneat.com',
          telephone: '0123456791',
          adresse: '789 Rue Livreur',
          code_postal: '75002',
          ville: 'Paris',
          role: 'delivery'
        });

      if (profileError) {
        console.error('❌ Erreur profil livreur:', profileError);
      } else {
        console.log('✅ Compte LIVREUR créé avec succès !');
        console.log('   Email: livreur@cvneat.com');
        console.log('   Mot de passe: livreur123');
      }
    }

    // 4. Créer un compte CLIENT
    console.log('\n👤 Création du compte CLIENT...');
    const { data: clientUser, error: clientError } = await supabase.auth.admin.createUser({
      email: 'client@cvneat.com',
      password: 'client123',
      email_confirm: true
    });

    if (clientError) {
      console.error('❌ Erreur création client:', clientError);
    } else {
      // Créer le profil utilisateur client
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: clientUser.user.id,
          nom: 'Client',
          prenom: 'Test',
          email: 'client@cvneat.com',
          telephone: '0123456792',
          adresse: '321 Rue Client',
          code_postal: '75003',
          ville: 'Paris',
          role: 'user'
        });

      if (profileError) {
        console.error('❌ Erreur profil client:', profileError);
      } else {
        console.log('✅ Compte CLIENT créé avec succès !');
        console.log('   Email: client@cvneat.com');
        console.log('   Mot de passe: client123');
      }
    }

    console.log('\n🎉 Tous les comptes de test ont été créés !');
    console.log('\n📋 Récapitulatif des connexions :');
    console.log('   👑 ADMIN: admin@cvneat.com / admin123');
    console.log('   🍕 PARTENAIRE: restaurant@cvneat.com / restaurant123');
    console.log('   🚚 LIVREUR: livreur@cvneat.com / livreur123');
    console.log('   👤 CLIENT: client@cvneat.com / client123');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
createTestAccounts(); 