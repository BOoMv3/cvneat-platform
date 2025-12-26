/**
 * Script pour fermer le Burger Cévenol et annuler leur dernière commande avec remboursement
 * Usage: node scripts/fermer-burger-cevenol-et-annuler-commande.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY manquante');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey);

async function fermerBurgerCevenolEtAnnulerCommande() {
  try {
    console.log('🔍 Recherche du Burger Cévenol...\n');
    
    // 1. Trouver le restaurant "Le Cévenol Burger"
    const { data: restaurants, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id, nom, email, telephone, ferme_manuellement')
      .or('nom.ilike.%cévenol%burger%,nom.ilike.%cevenol%burger%,nom.ilike.%cévenol burger%,nom.ilike.%cevenol burger%,nom.ilike.%burger%cevenol%,nom.ilike.%burger%cévenol%');

    if (restaurantError) {
      console.error('❌ Erreur recherche restaurant:', restaurantError);
      return;
    }

    if (!restaurants || restaurants.length === 0) {
      console.error('❌ Restaurant Burger Cévenol non trouvé');
      return;
    }

    const restaurant = restaurants[0];
    console.log(`✅ Restaurant trouvé: ${restaurant.nom} (ID: ${restaurant.id})`);

    // 2. Fermer le restaurant
    console.log('\n🔒 Fermeture du restaurant...');
    const { error: closeError } = await supabaseAdmin
      .from('restaurants')
      .update({ 
        ferme_manuellement: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurant.id);

    if (closeError) {
      console.error('❌ Erreur fermeture restaurant:', closeError);
      return;
    }
    console.log('✅ Restaurant fermé (ferme_manuellement = true)');

    // 3. Trouver la dernière commande
    console.log('\n🔍 Recherche de la dernière commande...');
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select(`
        id,
        created_at,
        statut,
        payment_status,
        total,
        frais_livraison,
        stripe_payment_intent_id,
        user_id,
        users:user_id(email, nom, prenom)
      `)
      .eq('restaurant_id', restaurant.id)
      .neq('statut', 'annulee')
      .order('created_at', { ascending: false })
      .limit(1);

    if (ordersError) {
      console.error('❌ Erreur recherche commandes:', ordersError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('ℹ️ Aucune commande non annulée trouvée pour ce restaurant');
      return;
    }

    const order = orders[0];
    const user = order.users;
    const totalAvecLivraison = parseFloat(order.total || 0) + parseFloat(order.frais_livraison || 0);

    console.log(`✅ Dernière commande trouvée:`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Date: ${new Date(order.created_at).toLocaleString('fr-FR')}`);
    console.log(`   Statut: ${order.statut}`);
    console.log(`   Montant: ${totalAvecLivraison.toFixed(2)}€`);
    console.log(`   Client: ${user?.prenom || ''} ${user?.nom || ''} (${user?.email || 'N/A'})`);
    console.log(`   Payment Intent: ${order.stripe_payment_intent_id || 'N/A'}`);

    // 4. Rembourser si nécessaire
    let refund = null;
    const needsRefund = 
      (order.payment_status === 'paid' || order.payment_status === 'succeeded') &&
      order.stripe_payment_intent_id &&
      totalAvecLivraison > 0;

    if (needsRefund) {
      console.log('\n💰 Création du remboursement Stripe...');
      try {
        refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: Math.round(totalAvecLivraison * 100), // Stripe utilise les centimes
          reason: 'requested_by_customer',
          metadata: {
            order_id: order.id,
            cancellation_reason: 'Restaurant fermé - Congés',
            admin_action: 'close_restaurant_and_cancel_order'
          }
        });

        console.log(`✅ Remboursement créé: ${refund.id}`);
        console.log(`   Montant remboursé: ${totalAvecLivraison.toFixed(2)}€`);
        console.log(`   Statut: ${refund.status}`);
      } catch (stripeError) {
        console.error('❌ Erreur remboursement Stripe:', stripeError.message);
        console.log('⚠️ La commande sera quand même annulée dans la base de données');
      }
    } else {
      console.log('ℹ️ Aucun remboursement nécessaire (commande non payée ou pas de Payment Intent)');
    }

    // 5. Annuler la commande dans la base de données
    console.log('\n📝 Annulation de la commande dans la base de données...');
    const updatePayload = {
      statut: 'annulee',
      updated_at: new Date().toISOString()
    };

    if (refund) {
      updatePayload.payment_status = 'refunded';
      updatePayload.stripe_refund_id = refund.id;
      updatePayload.refund_amount = totalAvecLivraison;
      updatePayload.refunded_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update(updatePayload)
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Erreur mise à jour commande:', updateError);
      return;
    }
    console.log('✅ Commande annulée dans la base de données');

    // 6. Créer une notification pour le client
    if (order.user_id) {
      try {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: order.user_id,
            type: 'order_cancelled_refunded',
            title: 'Commande annulée - Restaurant fermé',
            message: `Votre commande #${order.id.slice(0, 8)} du Burger Cévenol a été annulée car le restaurant est en congés.${refund ? ` Un remboursement de ${totalAvecLivraison.toFixed(2)}€ sera visible sur votre compte dans 2-5 jours ouvrables.` : ''}`,
            data: {
              order_id: order.id,
              refund_id: refund?.id || null,
              refund_amount: refund ? totalAvecLivraison : null,
              reason: 'Restaurant fermé - Congés'
            },
            read: false,
            created_at: new Date().toISOString()
          });
        console.log('✅ Notification créée pour le client');
      } catch (notificationError) {
        console.warn('⚠️ Erreur création notification:', notificationError.message);
      }
    }

    console.log('\n✅ Opération terminée avec succès !');
    console.log('\n📊 Résumé:');
    console.log(`   - Restaurant: ${restaurant.nom} (FERMÉ)`);
    console.log(`   - Commande annulée: ${order.id}`);
    console.log(`   - Remboursement: ${refund ? `${totalAvecLivraison.toFixed(2)}€ (${refund.id})` : 'Non applicable'}`);

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    process.exit(1);
  }
}

// Exécuter le script
fermerBurgerCevenolEtAnnulerCommande()
  .then(() => {
    console.log('\n✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

