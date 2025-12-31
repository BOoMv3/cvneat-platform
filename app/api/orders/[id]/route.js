import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
// DÉSACTIVÉ: Remboursements automatiques désactivés
// import { cleanupExpiredOrders } from '../../../../lib/orderCleanup';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log(`📡 [API /orders/${id}] Début de la requête`);
    
    // DÉSACTIVÉ: Nettoyage automatique des commandes expirées (remboursements automatiques désactivés)
    // cleanupExpiredOrders().catch(err => {
    //   console.warn('⚠️ Erreur nettoyage commandes expirées (non bloquant):', err);
    // });
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || null;
    const url = new URL(request.url);
    const securityCodeParam = url.searchParams.get('code') || request.headers.get('x-order-code');
    console.log(`🔑 [API /orders/${id}] Token présent: ${!!token}, Code sécurité présent: ${!!securityCodeParam}`);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.error('Configuration Supabase incomplète');
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    let order = null;
    let user = null;
    let isAdmin = false;
    let deliveryDriver = null;

    if (token) {
      const supabaseUser = createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );

      const { data: { user: sessionUser }, error: userError } = await supabaseUser.auth.getUser(token);

      if (userError || !sessionUser) {
        return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
      }

      user = sessionUser;

      const { data: userRoleData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      isAdmin = userRoleData?.role === 'admin';

      const { data: orderAccess, error: orderAccessError } = await supabaseAdmin
        .from('commandes')
        .select('id, user_id, security_code')
        .eq('id', id)
        .maybeSingle();

      // Amélioration: Ne retourner 404 que si vraiment pas de données
      // orderAccessError peut contenir des erreurs RLS bénignes
      if (!orderAccess) {
        console.log(`❌ Commande ${id} non trouvée dans la base de données`);
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      // Si erreur critique (autre que RLS), logger et continuer quand même
      if (orderAccessError) {
        console.warn(`⚠️ Erreur RLS lors de l'accès à la commande ${id}:`, orderAccessError.message);
        // Ne pas bloquer ici, continuer avec les vérifications d'accès ci-dessous
      }

      const securityMatches = securityCodeParam && orderAccess.security_code === securityCodeParam;

      if (!isAdmin) {
        if (orderAccess.user_id && orderAccess.user_id !== user.id && !securityMatches) {
          return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à voir cette commande' }, { status: 403 });
        }

        if (!orderAccess.user_id && !securityMatches) {
          return NextResponse.json({ error: 'Authentification requise pour cette commande' }, { status: 403 });
        }
      }

      const { data: orderFull, error: orderError } = await supabaseAdmin
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
        .eq('id', id)
        .single();
      
      // Récupérer les informations du livreur si un livreur a accepté la commande
      if (orderFull?.livreur_id) {
        const { data: driverData, error: driverError } = await supabaseAdmin
          .from('users')
          .select('id, prenom, nom, telephone')
          .eq('id', orderFull.livreur_id)
          .single();
        
        if (!driverError && driverData) {
          deliveryDriver = {
            id: driverData.id,
            prenom: driverData.prenom,
            nom: driverData.nom,
            telephone: driverData.telephone,
            full_name: `${driverData.prenom || ''} ${driverData.nom || ''}`.trim()
          };
        }
      }

      if (orderError || !orderFull) {
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      order = orderFull;
      
      // Récupérer les détails séparément si la relation n'a pas fonctionné (pour accès via token)
      if (!order.details_commande || !Array.isArray(order.details_commande) || order.details_commande.length === 0) {
        console.log(`⚠️ Commande ${id?.slice(0, 8)} sans détails via relation Supabase (token), récupération séparée...`);
        try {
          const { data: allDetails, error: detailsError } = await supabaseAdmin
            .from('details_commande')
            .select(`
              id,
              commande_id,
              plat_id,
              quantite,
              prix_unitaire,
              supplements,
              customizations,
              menus (
                nom,
                prix
              )
            `)
            .eq('commande_id', id);
          
          if (!detailsError && allDetails && allDetails.length > 0) {
            console.log(`✅ ${allDetails.length} détails récupérés séparément pour commande ${id?.slice(0, 8)} (token)`);
            order.details_commande = allDetails;
          } else if (detailsError) {
            console.error('❌ Erreur récupération détails séparés (token):', detailsError);
          } else {
            console.warn(`⚠️ Aucun détail trouvé en BDD pour commande ${id?.slice(0, 8)} (token)`);
          }
        } catch (detailsFetchError) {
          console.error('❌ Erreur lors de la récupération séparée des détails (token):', detailsFetchError);
        }
      }
    } else if (securityCodeParam) {
      const { data: orderFull, error: orderError } = await supabaseAdmin
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
        .eq('id', id)
        .eq('security_code', securityCodeParam)
        .single();

      if (orderError || !orderFull) {
        return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
      }

      order = orderFull;
      
      // Récupérer les informations du livreur si un livreur a accepté la commande
      let deliveryDriver = null;
      if (orderFull?.livreur_id) {
        const { data: driverData, error: driverError } = await supabaseAdmin
          .from('users')
          .select('id, prenom, nom, telephone')
          .eq('id', orderFull.livreur_id)
          .single();
        
        if (!driverError && driverData) {
          deliveryDriver = {
            id: driverData.id,
            prenom: driverData.prenom,
            nom: driverData.nom,
            telephone: driverData.telephone,
            full_name: `${driverData.prenom || ''} ${driverData.nom || ''}`.trim()
          };
        }
      }
      
      // Récupérer les détails séparément si la relation n'a pas fonctionné (pour accès via code sécurité)
      if (!order.details_commande || !Array.isArray(order.details_commande) || order.details_commande.length === 0) {
        console.log(`⚠️ Commande ${id?.slice(0, 8)} sans détails via relation Supabase (code sécurité), récupération séparée...`);
        try {
          const { data: allDetails, error: detailsError } = await supabaseAdmin
            .from('details_commande')
            .select(`
              id,
              commande_id,
              plat_id,
              quantite,
              prix_unitaire,
              supplements,
              customizations,
              menus (
                nom,
                prix
              )
            `)
            .eq('commande_id', id);
          
          if (!detailsError && allDetails && allDetails.length > 0) {
            console.log(`✅ ${allDetails.length} détails récupérés séparément pour commande ${id?.slice(0, 8)} (code sécurité)`);
            order.details_commande = allDetails;
          } else if (detailsError) {
            console.error('❌ Erreur récupération détails séparés (code sécurité):', detailsError);
          } else {
            console.warn(`⚠️ Aucun détail trouvé en BDD pour commande ${id?.slice(0, 8)} (code sécurité)`);
          }
        } catch (detailsFetchError) {
          console.error('❌ Erreur lors de la récupération séparée des détails (code sécurité):', detailsFetchError);
        }
      }
    } else {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    const restaurant = order.restaurants;
    let customerName = [order.customer_first_name, order.customer_last_name].filter(Boolean).join(' ').trim();
    let customerPhone = order.customer_phone || '';
    let customerEmail = order.customer_email || '';

    try {
      if (order.user_id) {
        const { data: customerData } = await supabaseAdmin
          .from('users')
          .select('prenom, nom, telephone, email')
          .eq('id', order.user_id)
          .single();

        if (customerData) {
          const nameParts = [customerData.prenom, customerData.nom].filter(Boolean).join(' ').trim();
          customerName = nameParts || customerData.email || customerName || 'Client';
          customerPhone = customerData.telephone || customerPhone;
          customerEmail = customerData.email || customerEmail;
        } else {
          const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
          if (authUser?.email) {
            customerName = customerName || authUser.email;
            customerEmail = authUser.email;
          }
        }
      }
    } catch (customerError) {
      console.warn('⚠️ Impossible de récupérer les infos client:', customerError);
    }

    if (!customerName) {
      customerName = customerEmail || 'Client';
    }

    const items = (order.details_commande || []).map(detail => {
      let supplements = [];
      if (detail.supplements) {
        if (typeof detail.supplements === 'string') {
          try {
            supplements = JSON.parse(detail.supplements);
          } catch {
            supplements = [];
          }
        } else if (Array.isArray(detail.supplements)) {
          supplements = detail.supplements;
        }
      }

      let customizations = {};
      if (detail.customizations) {
        if (typeof detail.customizations === 'string') {
          try {
            customizations = JSON.parse(detail.customizations);
          } catch {
            customizations = {};
          }
        } else if (typeof detail.customizations === 'object') {
          customizations = detail.customizations;
        }
      }

      // CRITIQUE: Si c'est une formule, utiliser le nom de la formule, pas le nom du menu burger
      const isFormula = customizations.is_formula === true;
      const itemName = isFormula 
        ? (customizations.formula_name || 'Formule')
        : (detail.menus?.nom || 'Article');
      
      return {
        id: detail.id,
        name: itemName,
        quantity: detail.quantite || 0,
        price: parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0,
        supplements,
        customizations,
        isFormula: isFormula
      };
    });

    const addressParts = (order.adresse_livraison || '').split(',').map(s => s.trim());
    const deliveryAddress = addressParts[0] || '';
    const deliveryCity = addressParts.length > 2 ? addressParts[1] : (addressParts[1] || '');
    const deliveryPostalCode =
      addressParts.length > 2
        ? (addressParts[2]?.split(' ')[0] || '')
        : (addressParts[1]?.split(' ')[0] || '');
    const deliveryPhone = order.telephone || order.phone || order.customer_phone || '';

    // Calculer le sous-total réel depuis les détails de commande
    let calculatedSubtotal = 0;
    if (order.details_commande && Array.isArray(order.details_commande)) {
      calculatedSubtotal = order.details_commande.reduce((sum, detail) => {
        const prix = parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0;
        const qty = parseFloat(detail.quantite || 1) || 0;
        return sum + (prix * qty);
      }, 0);
    }
    
    // Utiliser le sous-total calculé si disponible, sinon utiliser order.total
    const subtotalAmount = calculatedSubtotal > 0 ? calculatedSubtotal : parseFloat(order.total || 0) || 0;
    
    // Récupérer le montant réellement payé depuis Stripe si disponible
    let actualDeliveryFee = parseFloat(order.frais_livraison || 0) || 0;
    let actualPlatformFee = parseFloat(order.platform_fee || 0) || 0;
    let actualTotal = subtotalAmount + actualDeliveryFee + actualPlatformFee;
    
    // Si un PaymentIntent existe, récupérer le montant réellement payé
    if (order.stripe_payment_intent_id && stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        if (paymentIntent && paymentIntent.amount) {
          // Montant en centimes, convertir en euros
          const paidAmount = paymentIntent.amount / 100;
          
          // Calculer les frais réels à partir du montant payé
          // paidAmount = subtotal + deliveryFee + platformFee
          // Donc: deliveryFee + platformFee = paidAmount - subtotal
          const feesTotal = paidAmount - subtotalAmount;
          
          // Si les frais calculés sont différents de ceux stockés, utiliser les frais réels
          if (feesTotal > 0 && Math.abs(feesTotal - (actualDeliveryFee + actualPlatformFee)) > 0.01) {
            // Essayer de séparer les frais de livraison et de plateforme
            // On connaît le frais de plateforme (0.49€ généralement)
            const knownPlatformFee = actualPlatformFee || 0.49;
            actualDeliveryFee = Math.max(0, feesTotal - knownPlatformFee);
            actualPlatformFee = knownPlatformFee;
            actualTotal = paidAmount;
            
            console.log('💰 Frais réels calculés depuis Stripe (détail):', {
              orderId: order.id,
              paidAmount,
              subtotalAmount,
              actualDeliveryFee,
              actualPlatformFee,
              storedDeliveryFee: order.frais_livraison,
              storedPlatformFee: order.platform_fee
            });
          }
        }
      } catch (stripeError) {
        console.warn('⚠️ Impossible de récupérer le PaymentIntent Stripe:', stripeError.message);
        // Continuer avec les valeurs stockées
      }
    }
    
    const deliveryFee = actualDeliveryFee;
    const platformFee = actualPlatformFee;
    const totalWithDelivery = actualTotal;

    const formattedOrder = {
      id: order.id,
      status: order.statut || order.status,
      statut: order.statut || order.status,
      createdAt: order.created_at,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: order.updated_at || new Date().toISOString(),
      user_id: order.user_id,
      security_code: order.security_code,
      frais_livraison: deliveryFee,
      delivery_fee: deliveryFee,
      deliveryFee,
      platform_fee: platformFee,
      platformFee,
      adresse_livraison: order.adresse_livraison,
      preparation_time: order.preparation_time,
      livreur_id: order.livreur_id,
      delivery_driver: deliveryDriver,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      security_code: order.security_code,
      restaurant: {
        id: restaurant?.id,
        name: restaurant?.nom || 'Restaurant inconnu',
        address: restaurant?.adresse || '',
        city: restaurant?.ville || '',
        postal_code: restaurant?.code_postal || ''
      },
      deliveryAddress,
      deliveryCity,
      deliveryPostalCode,
      deliveryPhone: deliveryPhone || customerPhone,
      subtotal: subtotalAmount,
      subtotal_amount: subtotalAmount,
      total: totalWithDelivery,
      total_amount: totalWithDelivery,
      total_with_delivery: totalWithDelivery,
      items,
      delivery_instructions: order.instructions_livraison || order.delivery_instructions || null,
      refund_amount: order.refund_amount ? parseFloat(order.refund_amount) : null,
      refunded_at: order.refunded_at || null,
      stripe_refund_id: order.stripe_refund_id || null,
      payment_status: order.payment_status || 'pending',
      rejection_reason: order.rejection_reason || null,
      rejectionReason: order.rejection_reason || null,
      details_commande: (order.details_commande || []).map(detail => {
        let supplements = [];
        if (detail.supplements) {
          if (typeof detail.supplements === 'string') {
            try {
              supplements = JSON.parse(detail.supplements);
            } catch {
              supplements = [];
            }
          } else if (Array.isArray(detail.supplements)) {
            supplements = detail.supplements;
          }
        }

        let customizations = {};
        if (detail.customizations) {
          if (typeof detail.customizations === 'string') {
            try {
              customizations = JSON.parse(detail.customizations);
            } catch {
              customizations = {};
            }
          } else if (typeof detail.customizations === 'object') {
            customizations = detail.customizations;
          }
        }

        return {
          ...detail,
          supplements,
          customizations
        };
      })
    };

    console.log(`✅ [API /orders/${id}] Commande récupérée avec succès - Statut: ${formattedOrder.statut}, Client: ${customerName}`);
    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Erreur générale dans GET /api/orders/[id]:', error);
    return NextResponse.json({
      error: 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    console.log(`📝 [API PUT /orders/${id}] Mise à jour commande:`, body);

    // Utiliser le client admin pour permettre la mise à jour
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Préparer les données de mise à jour
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Accepter statut ou status
    if (body.statut || body.status) {
      updateData.statut = body.statut || body.status;
    }

    // Accepter payment_status
    if (body.payment_status !== undefined) {
      updateData.payment_status = body.payment_status;
    }

    // Accepter stripe_payment_intent_id
    if (body.stripe_payment_intent_id) {
      updateData.stripe_payment_intent_id = body.stripe_payment_intent_id;
    }

    const { data, error } = await supabaseAdmin
      .from('commandes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`❌ [API PUT /orders/${id}] Erreur mise à jour:`, error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    console.log(`✅ [API PUT /orders/${id}] Commande mise à jour avec succès`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [API PUT /orders/[id]] Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}