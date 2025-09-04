// Script de test pour démontrer le flux complet des alertes
// Client → Restaurant → Livreur

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = 'https://your-project.supabase.co'; // Remplacez par votre URL
const supabaseKey = 'your-anon-key'; // Remplacez par votre clé

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteFlow() {
  console.log('🚀 DÉMARRAGE DU TEST DE FLUX COMPLET');
  console.log('=====================================');

  try {
    // 1. Créer une commande de test avec statut 'pending'
    console.log('\n📝 ÉTAPE 1: Création d\'une commande de test...');
    
    const testOrder = {
      user_id: '11111111-1111-1111-1111-111111111111', // Client de test
      restaurant_id: '7f1e0b5f-5552-445d-a582-306515030c8d', // Restaurant de test
      status: 'pending',
      customer_name: 'Client Test',
      customer_phone: '0123456789',
      delivery_address: '123 Rue de Test, Paris',
      delivery_city: 'Paris',
      delivery_postal_code: '75001',
      delivery_instructions: 'Sonner fort, 3ème étage',
      items: [
        {
          name: 'Pizza Margherita',
          price: 12.50,
          quantity: 1
        },
        {
          name: 'Coca Cola',
          price: 2.50,
          quantity: 2
        }
      ],
      total_amount: 17.50,
      delivery_fee: 3.00,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([testOrder])
      .select()
      .single();

    if (orderError) {
      console.error('❌ Erreur création commande:', orderError);
      return;
    }

    console.log('✅ Commande créée avec succès !');
    console.log('   ID:', order.id);
    console.log('   Statut:', order.status);
    console.log('   Montant:', order.total_amount + '€');
    console.log('   Restaurant ID:', order.restaurant_id);

    // 2. Attendre un peu pour que les alertes se déclenchent
    console.log('\n⏳ Attente de 3 secondes pour les alertes...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Simuler l'acceptation par le restaurant
    console.log('\n🍕 ÉTAPE 2: Simulation acceptation restaurant...');
    
    const { error: acceptError } = await supabase
      .from('orders')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (acceptError) {
      console.error('❌ Erreur acceptation restaurant:', acceptError);
      return;
    }

    console.log('✅ Restaurant a accepté la commande !');

    // 4. Attendre un peu
    console.log('\n⏳ Attente de 2 secondes...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Marquer comme prête (ready) pour notifier les livreurs
    console.log('\n📦 ÉTAPE 3: Marquer comme prête pour les livreurs...');
    
    const { error: readyError } = await supabase
      .from('orders')
      .update({ 
        status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (readyError) {
      console.error('❌ Erreur marquage prêt:', readyError);
      return;
    }

    console.log('✅ Commande marquée comme prête !');
    console.log('   Les livreurs devraient maintenant recevoir une alerte !');

    // 6. Vérifier le statut final
    console.log('\n🔍 ÉTAPE 4: Vérification du statut final...');
    
    const { data: finalOrder, error: finalError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();

    if (finalError) {
      console.error('❌ Erreur vérification finale:', finalError);
      return;
    }

    console.log('✅ Statut final de la commande:');
    console.log('   ID:', finalOrder.id);
    console.log('   Statut:', finalOrder.status);
    console.log('   Client:', finalOrder.customer_name);
    console.log('   Montant:', finalOrder.total_amount + '€');
    console.log('   Créée le:', new Date(finalOrder.created_at).toLocaleString('fr-FR'));

    console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !');
    console.log('=====================================');
    console.log('📱 Vérifiez maintenant:');
    console.log('   1. Page restaurant (/restaurant/orders) - devrait avoir reçu une alerte');
    console.log('   2. Page livreur (/delivery) - devrait avoir reçu une alerte');
    console.log('   3. Les notifications sonores et visuelles devraient s\'être déclenchées');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le test
testCompleteFlow();
