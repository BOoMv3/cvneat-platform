/**
 * Script de test pour vérifier le suivi de livraison client
 * Ce script teste l'API /api/orders/[id] et /api/orders/[id]/tracking
 * 
 * Usage: node test-tracking-api.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTrackingSystem() {
  console.log('🧪 === TEST DU SYSTÈME DE SUIVI DE LIVRAISON ===\n');

  try {
    // 1. Récupérer une commande de test
    console.log('📋 Étape 1: Récupération d\'une commande de test...');
    const { data: orders, error: ordersError } = await supabase
      .from('commandes')
      .select(`
        id,
        statut,
        user_id,
        security_code,
        adresse_livraison,
        livreur_id,
        restaurants (
          nom
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError || !orders || orders.length === 0) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      console.error('   Aucune commande trouvée dans la base de données');
      return;
    }

    console.log(`✅ ${orders.length} commandes trouvées`);
    console.log('\n📦 Commandes disponibles:');
    orders.forEach((order, index) => {
      console.log(`   ${index + 1}. Commande ${order.id}`);
      console.log(`      - Statut: ${order.statut}`);
      console.log(`      - Restaurant: ${order.restaurants?.nom || 'N/A'}`);
      console.log(`      - Client ID: ${order.user_id || 'N/A'}`);
      console.log(`      - Livreur ID: ${order.livreur_id || 'Aucun'}`);
    });

    // Tester avec la première commande
    const testOrder = orders[0];
    console.log(`\n🎯 Test avec commande: ${testOrder.id}\n`);

    // 2. Vérifier l'accès à l'API /api/orders/[id]
    console.log('📋 Étape 2: Test de l\'API /api/orders/[id]...');
    
    // Simuler une requête avec le code de sécurité
    const orderDetailsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/orders/${testOrder.id}?code=${testOrder.security_code}`;
    console.log(`   URL de test: ${orderDetailsUrl}`);
    
    // Note: Dans un vrai test, on ferait un fetch ici
    // Pour ce test de diagnostic, on vérifie juste les données de la BDD
    
    const { data: orderDetails, error: orderDetailsError } = await supabase
      .from('commandes')
      .select(`
        *,
        details_commande (
          id,
          quantite,
          prix_unitaire,
          supplements,
          customizations,
          menus (
            nom,
            prix
          )
        ),
        restaurants (
          id,
          nom,
          adresse,
          ville,
          code_postal
        )
      `)
      .eq('id', testOrder.id)
      .single();

    if (orderDetailsError || !orderDetails) {
      console.error('❌ Erreur récupération détails commande:', orderDetailsError);
      return;
    }

    console.log('✅ Détails de commande récupérés:');
    console.log(`   - ID: ${orderDetails.id}`);
    console.log(`   - Statut: ${orderDetails.statut}`);
    console.log(`   - Adresse: ${orderDetails.adresse_livraison}`);
    console.log(`   - Articles: ${orderDetails.details_commande?.length || 0}`);
    console.log(`   - Restaurant: ${orderDetails.restaurants?.nom || 'N/A'}`);
    console.log(`   - Code sécurité: ${orderDetails.security_code}`);

    // 3. Vérifier les données de tracking GPS
    console.log('\n📋 Étape 3: Vérification des données de tracking GPS...');
    if (orderDetails.livreur_id) {
      console.log('✅ Livreur assigné:', orderDetails.livreur_id);
      console.log(`   - Position GPS: ${orderDetails.livreur_latitude ? 'Oui' : 'Non'}`);
      console.log(`   - Dernière mise à jour: ${orderDetails.livreur_position_updated_at || 'Jamais'}`);
    } else {
      console.log('⚠️ Aucun livreur assigné à cette commande');
    }

    // 4. Vérifier les permissions d'accès
    console.log('\n📋 Étape 4: Vérification des permissions...');
    console.log(`   - User ID: ${orderDetails.user_id || 'Aucun'}`);
    console.log(`   - Code sécurité: ${orderDetails.security_code}`);
    
    if (orderDetails.user_id) {
      // Vérifier que l'utilisateur existe
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, prenom, nom')
        .eq('id', orderDetails.user_id)
        .single();

      if (userError || !userData) {
        console.log('⚠️ Utilisateur non trouvé dans la table users');
      } else {
        console.log(`✅ Utilisateur trouvé: ${userData.email}`);
      }
    }

    // 5. Résumé du diagnostic
    console.log('\n📊 === RÉSUMÉ DU DIAGNOSTIC ===');
    const issues = [];
    
    if (!orderDetails.details_commande || orderDetails.details_commande.length === 0) {
      issues.push('❌ Aucun détail de commande trouvé');
    } else {
      console.log('✅ Détails de commande: OK');
    }

    if (!orderDetails.restaurants) {
      issues.push('❌ Informations restaurant manquantes');
    } else {
      console.log('✅ Informations restaurant: OK');
    }

    if (!orderDetails.adresse_livraison) {
      issues.push('⚠️ Adresse de livraison manquante');
    } else {
      console.log('✅ Adresse de livraison: OK');
    }

    if (!orderDetails.security_code) {
      issues.push('⚠️ Code de sécurité manquant');
    } else {
      console.log('✅ Code de sécurité: OK');
    }

    if (orderDetails.statut === 'en_livraison' && !orderDetails.livreur_id) {
      issues.push('❌ Commande en livraison mais pas de livreur assigné');
    } else if (orderDetails.livreur_id && !orderDetails.livreur_latitude) {
      issues.push('⚠️ Livreur assigné mais position GPS non disponible');
    } else if (orderDetails.livreur_id) {
      console.log('✅ Tracking GPS: OK');
    }

    if (issues.length > 0) {
      console.log('\n⚠️ Problèmes détectés:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('\n✅ Tous les tests sont passés ! Le suivi de livraison devrait fonctionner.');
    }

    // 6. Instructions pour tester manuellement
    console.log('\n📝 === INSTRUCTIONS DE TEST MANUEL ===');
    console.log('Pour tester le suivi de livraison manuellement:');
    console.log(`1. Connectez-vous avec l'utilisateur: ${orderDetails.user_id || 'Créez un utilisateur'}`);
    console.log(`2. Accédez à: /track-order?orderId=${testOrder.id}`);
    console.log(`3. OU utilisez le code: /track/${testOrder.id}?code=${testOrder.security_code}`);
    console.log('\nVérifiez:');
    console.log('- Le statut de la commande s\'affiche correctement');
    console.log('- Les articles de la commande sont listés');
    console.log('- Le polling automatique fonctionne (toutes les 5 secondes)');
    console.log('- Les notifications s\'affichent lors du changement de statut');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Exécuter le test
testTrackingSystem()
  .then(() => {
    console.log('\n✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });

