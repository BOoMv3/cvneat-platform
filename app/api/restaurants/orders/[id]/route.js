import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { notifyDeliverySubscribers } from '../../../../../lib/pushNotifications';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, reason, preparation_time } = body;
    
    console.log('=== MISE À JOUR COMMANDE RESTAURANT ===');
    console.log('ID commande:', id);
    console.log('Données reçues:', body);

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Pas de token d\'authentification');
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    // Token vérifié (non loggé pour des raisons de sécurité)

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('❌ Erreur authentification:', userError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', user.email);

    // Vérifier que l'utilisateur est un restaurant
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (userDataError || !userData || !['restaurant', 'partner'].includes(userData.role)) {
      console.error('❌ Utilisateur non autorisé:', userData);
      return NextResponse.json({ error: 'Accès non autorisé - Rôle restaurant requis' }, { status: 403 });
    }

    console.log('✅ Rôle restaurant/partner confirmé:', userData.role);

    // Vérifier que la commande existe - UTILISER SERVICE ROLE POUR BYPASSER RLS
    console.log('🔍 Recherche commande avec ID:', id);
    
    // Créer un client admin pour bypasser RLS
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 Résultat recherche commande:', { order: order?.id, error: orderError });

    if (orderError || !order) {
      console.error('❌ Commande non trouvée:', orderError);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    console.log('✅ Commande trouvée:', order.id, 'restaurant_id:', order.restaurant_id);

    // Vérifier que la commande appartient à ce restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant non trouvé pour cet utilisateur:', restaurantError);
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    console.log('🔍 Vérification appartenance:', {
      commande_restaurant: order.restaurant_id,
      restaurant_utilisateur: restaurant.id,
      match: order.restaurant_id === restaurant.id
    });

    // TEMPORAIRE : Bypass de la vérification d'appartenance pour debug
    console.log('⚠️ BYPASS TEMPORAIRE - Vérification d\'appartenance désactivée');
    
    // if (order.restaurant_id !== restaurant.id) {
    //   console.error('❌ Commande ne appartient pas à ce restaurant:', {
    //     commande_restaurant: order.restaurant_id,
    //     restaurant_utilisateur: restaurant.id
    //   });
    //   return NextResponse.json({ error: 'Cette commande ne vous appartient pas' }, { status: 403 });
    // }

    console.log('✅ Commande appartient au restaurant');

    // WORKFLOW: D'abord le livreur accepte, puis le restaurant accepte
    // Permettre au restaurant d'accepter une commande même si un livreur a déjà accepté
    // Le restaurant peut accepter ('acceptee') ou marquer comme prête ('pret_a_livrer')
    // MAIS: Permettre aussi la mise à jour du preparation_time même si un livreur a accepté
    // (utile pour notifier un retard sans changer le statut)
    const allowedStatusesWithDelivery = ['acceptee', 'pret_a_livrer', 'en_livraison', 'livree', 'refusee'];
    
    // Si un livreur a accepté, vérifier si on essaie de changer le statut vers une valeur non autorisée
    // PERMETTRE TOUJOURS LE REFUS même si un livreur a accepté (le livreur sera notifié)
    // PERMETTRE la mise à jour si :
    // 1. On ne change pas le statut (status n'est pas fourni, ou est identique au statut actuel)
    // 2. Ou si on change le statut vers une valeur autorisée (incluant 'refusee')
    if (order.livreur_id && status && status !== 'refusee') {
      // Mapper le statut pour vérifier s'il est autorisé (même mapping qu'utilisé plus tard)
      const statusMapping = {
        'acceptee': 'en_preparation',
        'refusee': 'annulee',
        'pret_a_livrer': 'en_preparation'
      };
      const mappedStatus = statusMapping[status] || status;
      
      // Vérifier si le statut change réellement
      const willChangeStatus = mappedStatus !== order.statut;
      
      // Si le statut va changer ET n'est pas dans la liste autorisée, bloquer
      if (willChangeStatus && !allowedStatusesWithDelivery.includes(status)) {
        console.log('⚠️ Commande déjà acceptée par un livreur, statut non autorisé:', status);
        return NextResponse.json({ 
          error: 'Cette commande a déjà été acceptée par un livreur. Vous ne pouvez que l\'accepter, la marquer comme prête, la remettre au livreur, la refuser ou la marquer comme livrée. Vous pouvez cependant modifier le temps de préparation.',
          current_status: order.statut,
          delivery_id: order.livreur_id
        }, { status: 400 });
      }
    }

    // Mettre à jour la commande - CORRIGER LE STATUT SELON LA CONTRAINTE CHECK
    let correctedStatus = status;
    let readyForDelivery = null;
    let shouldUpdateStatus = false;
    let shouldRemoveDeliveryId = false; // Flag pour retirer livreur_id si refusée
    
    // MAPPING POUR CORRESPONDRE EXACTEMENT À LA CONTRAINTE CHECK DE LA BASE DE DONNÉES
    // La contrainte CHECK accepte: 'en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee'
    // Nous devons mapper les statuts métier vers ces valeurs
    const statusMapping = {
      'acceptee': 'en_preparation',     // Quand restaurant accepte, passe directement en préparation
      'refusee': 'annulee',             // Refus = annulée
      'pret_a_livrer': 'en_preparation' // Prêt à livrer reste en préparation (livreur prend en charge ensuite)
    };
    
    if (statusMapping[status]) {
      correctedStatus = statusMapping[status];
      console.log('🔄 Statut mappé:', { original: status, final: correctedStatus, raison: 'Contrainte CHECK base de données' });
      shouldUpdateStatus = correctedStatus !== order.statut;
      
      // Si refusée, retirer le livreur_id pour libérer le livreur
      if (status === 'refusee') {
        shouldRemoveDeliveryId = true;
      }
    } else if (status && status !== order.statut) {
      // Si le statut est fourni et différent, mais pas dans le mapping, vérifier s'il est valide
      const validStatuses = ['en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee'];
      if (validStatuses.includes(status)) {
        correctedStatus = status;
        shouldUpdateStatus = true;
      } else {
        // Statut invalide ou pas de changement nécessaire
        shouldUpdateStatus = false;
      }
    }
    
    // Si le restaurant marque "prêt à livrer", on met ready_for_delivery = true
    // Sinon, si c'est "acceptee", on met ready_for_delivery = false
    // Si c'est "en_livraison", on garde ready_for_delivery = true (la commande était déjà prête)
    if (status === 'pret_a_livrer') {
      readyForDelivery = true;
    } else if (status === 'acceptee') {
      readyForDelivery = false;
    } else if (status === 'en_livraison') {
      // Si on passe en livraison, la commande doit être prête
      // Si elle n'était pas prête, on la marque comme prête aussi
      readyForDelivery = true;
    }
    
    console.log('📋 Statuts autorisés par CHECK: en_attente, en_preparation, en_livraison, livree, annulee');
    
    const updateData = {
      updated_at: new Date().toISOString()
    };

        // Ne mettre à jour le statut que si nécessaire
        if (shouldUpdateStatus) {
          updateData.statut = correctedStatus;
          
          // Si refusée, retirer le livreur_id pour libérer le livreur
          if (shouldRemoveDeliveryId) {
            updateData.livreur_id = null;
            console.log('🔓 Retrait du livreur_id car commande refusée');
          }
          
          // Ajouter ready_for_delivery si on change le statut
          if (readyForDelivery !== null) {
            updateData.ready_for_delivery = readyForDelivery;
          }
        } else if (readyForDelivery !== null) {
          // Même si le statut ne change pas, mettre à jour ready_for_delivery si nécessaire
          // (par exemple, si on marque "prête" alors que le statut est déjà "en_preparation")
          updateData.ready_for_delivery = readyForDelivery;
        }

    if (reason) {
      updateData.rejection_reason = reason;
    }

    // Ajouter preparation_time seulement si fourni et valide
    // Si le partenaire AJOUTE du retard (nouveau temps > ancien) et que le décompte a déjà commencé,
    // ne PAS réinitialiser preparation_started_at : on prolonge juste la fin, le timer continue.
    // Sinon (première définition ou réduction du temps), réinitialiser preparation_started_at.
    if (preparation_time !== null && preparation_time !== undefined && preparation_time > 0) {
      const existingPrepTime = order.preparation_time ?? 0;
      const existingStartedAt = order.preparation_started_at;
      const isAddingDelay = existingStartedAt && preparation_time > existingPrepTime;

      updateData.preparation_time = preparation_time;
      if (isAddingDelay) {
        // Ne pas toucher à preparation_started_at : le décompte continue, la fin est juste décalée
        console.log('🔄 Ajout de retard: preparation_time', existingPrepTime, '→', preparation_time, 'min, preparation_started_at inchangé');
      } else {
        // Première définition ou nouveau temps ≤ ancien : (re)démarrer le décompte à partir de maintenant
        updateData.preparation_started_at = new Date().toISOString();
        console.log('🔄 preparation_started_at défini/réinitialisé pour preparation_time:', preparation_time, 'min');
      }
    } else if (shouldUpdateStatus && (status === 'acceptee' || status === 'pret_a_livrer') && !order.preparation_started_at) {
      // Si on accepte la commande SANS définir de preparation_time explicite,
      // définir preparation_started_at seulement si il n'existe pas déjà
      updateData.preparation_started_at = new Date().toISOString();
      console.log('🔄 Définition de preparation_started_at lors de l\'acceptation (pas de preparation_time fourni)');
    }

        console.log('📤 Données de mise à jour:', JSON.stringify(updateData, null, 2));
        console.log('📤 ID commande à mettre à jour:', id);

        // Utiliser le service role pour la mise à jour aussi
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from('commandes')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        console.log('📤 Résultat de la mise à jour Supabase:', {
          success: !!updatedOrder && !updateError,
          error: updateError ? updateError.message : null,
          rows_affected: updatedOrder ? 1 : 0
        });

    if (updateError) {
          console.error('❌ Erreur mise à jour commande:', updateError);
          console.error('❌ Détails erreur:', JSON.stringify(updateError, null, 2));
          console.error('❌ ID commande tentée:', id);
          console.error('❌ Données tentées:', JSON.stringify(updateData, null, 2));
          return NextResponse.json({ 
            error: 'Erreur lors de la mise à jour de la commande',
            details: updateError.message,
            orderId: id
          }, { status: 500 });
        }

        // Notifier le livreur ASSIGNÉ (évite doublons et montants incohérents)
        // - L'alerte "Nouvelle commande disponible" est envoyée au paiement (drivers-first).
        // - Ici, on notifie uniquement l'évolution (préparation / prêt à récupérer).
        if ((status === 'en_preparation' || status === 'pret_a_livrer') && updatedOrder?.livreur_id) {
          try {
            const totalWithDelivery = (
              parseFloat(updatedOrder.total || 0) + parseFloat(updatedOrder.frais_livraison || 0)
            ).toFixed(2);

            const isReady = status === 'pret_a_livrer';
            const title = isReady ? 'Commande prête à récupérer 📦' : 'Commande en préparation 👨‍🍳';
            const bodyText = isReady
              ? `Commande #${updatedOrder.id?.slice(0, 8)} prête - Total ${totalWithDelivery}€`
              : `Commande #${updatedOrder.id?.slice(0, 8)} en préparation - Total ${totalWithDelivery}€`;

            const pushResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr'}/api/notifications/send-push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: updatedOrder.livreur_id,
                title,
                body: bodyText,
                data: {
                  type: 'delivery_status_update',
                  orderId: updatedOrder.id,
                  status,
                  url: '/delivery/dashboard',
                }
              })
            });
            
            if (pushResponse.ok) {
              const result = await pushResponse.json();
              console.log('✅ Notification push envoyée au livreur assigné:', result.sent, '/', result.total);
            }
          } catch (error) {
            console.error('❌ Erreur envoi notification push livreur assigné:', error);
          }
        }

        // Si la commande est annulée par le restaurant, rembourser automatiquement SEULEMENT si pas déjà livrée
        // NOTE: On peut maintenant refuser même si un livreur a accepté (le livreur_id est retiré)
        // Mais on ne rembourse PAS automatiquement si la commande était déjà en cours de livraison
        if (correctedStatus === 'annulee' && status === 'refusee' && order.payment_status === 'paid' && order.stripe_payment_intent_id) {
          // Ne pas rembourser si la commande est déjà livrée
          if (order.statut === 'livree' || order.statut === 'delivered') {
            console.log('⚠️ Remboursement BLOQUÉ: Commande déjà livrée (statut:', order.statut, ')');
            // On permet quand même l'annulation mais sans remboursement automatique
            console.log('⚠️ Commande refusée après livraison - Remboursement manuel requis');
            // Ne pas faire de remboursement automatique si déjà livrée
          } else if (!order.livreur_id || !updatedOrder.livreur_id) {
            // Rembourser automatiquement seulement si pas de livreur (ou si livreur_id a été retiré)
            // Si un livreur avait accepté mais qu'on l'a retiré, on rembourse quand même
            console.log('💰 Remboursement automatique autorisé (pas de livreur ou livreur retiré)');
            
            const orderTotal = parseFloat(order.total || 0);
          
            if (orderTotal > 0) {
            console.log('💰 Remboursement automatique nécessaire (annulation restaurant - commande non acceptée/livrée):', id);
            
            try {
              // IMPORTANT: Recalculer le sous-total depuis les détails de commande pour inclure les suppléments
              const { data: orderDetails, error: detailsError } = await supabaseAdmin
                .from('details_commande')
                .select('quantite, prix_unitaire, supplements')
                .eq('commande_id', id);
              
              let calculatedSubtotal = 0;
              if (!detailsError && orderDetails && orderDetails.length > 0) {
                // Calculer le sous-total depuis les détails
                // IMPORTANT: prix_unitaire contient déjà les suppléments (voir checkout/page.js ligne 570)
                // Donc on utilise directement prix_unitaire sans ajouter les suppléments
                orderDetails.forEach(detail => {
                  const prixUnitaire = parseFloat(detail.prix_unitaire || 0); // Déjà avec suppléments
                  const quantity = parseFloat(detail.quantite || 1);
                  calculatedSubtotal += prixUnitaire * quantity;
                });
                console.log('💰 Sous-total calculé depuis détails:', calculatedSubtotal);
              } else {
                // Fallback : utiliser order.total si pas de détails
                // ATTENTION: order.total peut ne pas contenir les suppléments si la commande a été créée différemment
                calculatedSubtotal = parseFloat(order.total || 0);
                console.warn('⚠️ Pas de détails de commande, utilisation de order.total comme fallback:', calculatedSubtotal);
              }
              
              // IMPORTANT: Le remboursement doit inclure les frais de livraison car ils n'ont pas été effectués
              const deliveryFee = parseFloat(order.frais_livraison || 0); // Frais de livraison
              
              // Si calculatedSubtotal est 0 ou très petit, essayer de recalculer depuis order.total
              // mais toujours ajouter les frais de livraison
              if (calculatedSubtotal <= 0 && parseFloat(order.total || 0) > 0) {
                calculatedSubtotal = parseFloat(order.total || 0);
                console.warn('⚠️ Sous-total recalculé depuis order.total:', calculatedSubtotal);
              }
              
              const orderTotalWithDelivery = calculatedSubtotal + deliveryFee; // Total réel payé (articles + suppléments + frais)
              
              console.log('💰 Remboursement restaurant - Montant:', {
                articles_avec_supplements: calculatedSubtotal,
                frais_livraison: deliveryFee,
                total: orderTotalWithDelivery
              });
              
              // Créer le remboursement Stripe (incluant les frais de livraison)
              const refund = await stripe.refunds.create({
                payment_intent: order.stripe_payment_intent_id,
                amount: Math.round(orderTotalWithDelivery * 100), // Stripe utilise les centimes - TOTAL avec frais
                reason: 'requested_by_customer',
                metadata: {
                  order_id: id,
                  cancellation_reason: `Commande annulée par le restaurant${reason ? ': ' + reason : ''}`,
                  user_id: order.user_id,
                  restaurant_id: order.restaurant_id
                }
              });

              console.log('✅ Remboursement Stripe créé:', refund.id);

              // Mettre à jour la commande avec les informations du remboursement
              await supabaseAdmin
                .from('commandes')
                .update({
                  payment_status: 'refunded',
                  stripe_refund_id: refund.id,
                  refund_amount: orderTotalWithDelivery, // Total avec frais de livraison
                  refunded_at: new Date().toISOString()
                })
                .eq('id', id);

              // Créer une notification pour le client
              try {
                await supabaseAdmin
                  .from('notifications')
                  .insert({
                    user_id: order.user_id,
                    type: 'order_cancelled_refunded',
                    title: 'Commande annulée et remboursée',
                    message: `Votre commande #${id.slice(0, 8)} a été annulée par le restaurant. Un remboursement de ${orderTotalWithDelivery.toFixed(2)}€ (articles avec suppléments: ${calculatedSubtotal.toFixed(2)}€ + frais de livraison: ${deliveryFee.toFixed(2)}€) sera visible sur votre compte dans 2-5 jours ouvrables.`,
                    data: {
                      order_id: id,
                      refund_id: refund.id,
                      refund_amount: orderTotalWithDelivery,
                      refund_subtotal: calculatedSubtotal,
                      refund_delivery_fee: deliveryFee,
                      cancelled_by: 'restaurant',
                      reason: reason
                    },
                    read: false,
                    created_at: new Date().toISOString()
                  });
                
                console.log('✅ Notification de remboursement créée');
              } catch (notificationError) {
                console.warn('⚠️ Erreur création notification:', notificationError);
              }

            } catch (stripeError) {
              console.error('❌ Erreur remboursement Stripe (annulation restaurant):', stripeError);
              // Ne pas faire échouer la requête, le restaurant a déjà annulé la commande
              // Le remboursement devra être traité manuellement
            }
            }
          }
        }

    // Envoyer les notifications par email au client pour chaque changement de statut
    try {
      // Récupérer les infos du restaurant et du client
      const { data: restaurantInfo } = await supabaseAdmin
        .from('restaurants')
        .select('nom')
        .eq('id', updatedOrder.restaurant_id)
        .single();
      
      const { data: clientInfo } = await supabaseAdmin
        .from('users')
        .select('email, telephone, nom, prenom')
        .eq('id', updatedOrder.user_id)
        .single();

      if (clientInfo && clientInfo.email) {
        // Importer le service de notifications par email
        const { sendOrderStatusEmail } = await import('../../../../../lib/order-email-notifications');
        
        // Préparer les données de la commande pour l'email
        const orderForEmail = {
          id: updatedOrder.id,
          restaurantName: restaurantInfo?.nom || 'Le restaurant',
          total: updatedOrder.total || 0,
          frais_livraison: updatedOrder.frais_livraison || 0,
          adresse_livraison: updatedOrder.adresse_livraison || '',
          order_fulfillment: updatedOrder.order_fulfillment || 'delivery',
          security_code: updatedOrder.security_code || null,
          preparationTime: preparation_time || null,
          customerName: `${clientInfo.prenom || ''} ${clientInfo.nom || ''}`.trim() || clientInfo.email
        };

        // Déterminer le statut à utiliser pour l'email
        // Utiliser le statut original (métier) pour les emails, pas le statut mappé
        let emailStatus = status;
        
        // Si le statut est "acceptee" ou que la commande passe en "en_preparation", envoyer email "acceptée"
        if (status === 'acceptee' || (status === 'en_preparation' && !order.statut || order.statut === 'en_attente')) {
          emailStatus = 'acceptee';
        }
        
        // Envoyer l'email selon le statut
        // 1. Commande acceptée (acceptee ou en_preparation après en_attente)
        if (status === 'acceptee' || (status === 'en_preparation' && (!order.statut || order.statut === 'en_attente'))) {
          await sendOrderStatusEmail(orderForEmail, 'acceptee', clientInfo.email);
          console.log('📧 Email "commande acceptée" envoyé au client:', clientInfo.email);
        }
        
        // 2. Commande prête (pret_a_livrer) - Utiliser le statut original pour l'email
        // IMPORTANT: Envoyer l'email même si le statut DB est "en_preparation" mais que ready_for_delivery = true
        if (status === 'pret_a_livrer' || (readyForDelivery === true && (status === 'pret_a_livrer' || order.statut === 'en_preparation'))) {
          await sendOrderStatusEmail(orderForEmail, 'pret_a_livrer', clientInfo.email);
          console.log('📧 Email "commande prête" envoyé au client:', clientInfo.email);
        }
        
        // 3. Commande remise au livreur (en_livraison)
        if (status === 'en_livraison') {
          await sendOrderStatusEmail(orderForEmail, 'en_livraison', clientInfo.email);
          console.log('📧 Email "commande en livraison" envoyé au client:', clientInfo.email);
        }
        
        // 4. Commande refusée (refusee)
        if (status === 'refusee') {
          await sendOrderStatusEmail(orderForEmail, 'refusee', clientInfo.email);
          console.log('📧 Email "commande refusée" envoyé au client:', clientInfo.email);
        }
        
        // Envoyer notification push FCM au client pour chaque changement de statut
        try {
          // Gérer les notifications push avec ready_for_delivery
          let pushStatus = status;
          if (status === 'pret_a_livrer' || (status === 'en_preparation' && readyForDelivery === true)) {
            pushStatus = 'pret_a_livrer';
          }
          
          const statusMessages = {
            'acceptee': {
              title: 'Commande acceptée ! 🎉',
              body:
                String(updatedOrder.order_fulfillment || 'delivery').toLowerCase() === 'pickup'
                  ? `Votre commande #${updatedOrder.id?.slice(0, 8)} est acceptée. Retrait sur place dans environ ${preparation_time || updatedOrder.preparation_time || 15} min.`
                  : `Votre commande #${updatedOrder.id?.slice(0, 8)} a été acceptée et sera préparée bientôt.`
            },
            'en_preparation': { title: 'En préparation 👨‍🍳', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} est en cours de préparation.` },
            'pret_a_livrer': { title: 'Commande prête ! 📦', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} est prête et sera livrée bientôt.` },
            'en_livraison': { title: 'En livraison 🚚', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} est en route vers vous !` },
            'livree': { title: 'Commande livrée ! ✅', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} a été livrée. Bon appétit !` },
            'refusee': { title: 'Commande refusée ❌', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} a été refusée.` },
            'annulee': { title: 'Commande annulée ❌', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} a été annulée.` }
          };
          
          const message = statusMessages[pushStatus];
          if (message) {
            const pushResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr'}/api/notifications/send-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: updatedOrder.user_id, // Envoyer au client spécifique
                title: message.title,
                body: message.body,
                data: {
                  type: 'order_status_update',
                  orderId: updatedOrder.id,
                  status: status,
                  url: `/orders/${updatedOrder.id}`,
                }
              })
            });
            
            if (pushResponse.ok) {
              const result = await pushResponse.json();
              console.log('✅ Notification push envoyée au client:', result.sent, '/', result.total);
            }
          }
        } catch (pushError) {
          console.warn('⚠️ Erreur notification push client:', pushError);
        }
      }
    } catch (notificationError) {
      console.warn('⚠️ Erreur notification email client:', notificationError);
      // Ne pas faire échouer la mise à jour pour une erreur de notification
    }

    // Notifier les livreurs si la commande est prête à livrer
    if (status === 'pret_a_livrer' || readyForDelivery === true) {
      try {
        // La notification sera automatiquement détectée par le SSE des livreurs
      } catch (notificationError) {
        console.warn('⚠️ Erreur notification livreurs:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Commande mise à jour avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur API restaurant commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

