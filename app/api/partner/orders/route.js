import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Créer un client avec le service role pour contourner RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('🔍 DEBUG getUserFromRequest - AuthHeader:', authHeader ? 'Présent' : 'Absent');
    
    const token = authHeader?.split(' ')[1];
    console.log('🔍 DEBUG getUserFromRequest - Token:', token ? 'Présent' : 'Absent');
    
    if (!token) {
      console.error('❌ Aucun token trouvé');
      return null;
    }
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('🔍 DEBUG getUserFromRequest - User:', user ? user.id : 'Aucun utilisateur');
    console.log('🔍 DEBUG getUserFromRequest - Error:', error);
    
    if (error || !user) {
      console.error('❌ Erreur ou utilisateur manquant:', error);
      return null;
    }

    // Vérifier le rôle dans la table users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    console.log('🔍 DEBUG getUserFromRequest - UserData:', userData);
    console.log('🔍 DEBUG getUserFromRequest - UserError:', userError);

    if (userError || !userData) {
      console.error('❌ Erreur récupération rôle:', userError);
      return null;
    }

    return { ...user, role: userData.role };
  } catch (error) {
    console.error('❌ Erreur authentification:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    console.log('=== API PARTNER ORDERS GET ===');
    console.log('Headers:', request.headers.get('authorization') ? 'Token présent' : 'Token manquant');
    
    const user = await getUserFromRequest(request);
    console.log('User récupéré:', user ? user.id : 'Aucun utilisateur');

    if (!user) {
      console.error('❌ Aucun utilisateur trouvé');
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    if (!['restaurant', 'partner'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé - Rôle restaurant requis' }, { status: 403 });
    }

    // Récupérer l'ID du restaurant associé à l'utilisateur partenaire
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurantData) {
      console.error('❌ Restaurant non trouvé pour user_id:', user.id);
      console.error('Erreur:', restaurantError);
      return NextResponse.json({ error: 'Restaurant non trouvé pour ce partenaire' }, { status: 404 });
    }

    const restaurantId = restaurantData.id;
    console.log('✅ Restaurant trouvé:', restaurantId, 'pour user:', user.id);

    // Récupérer les commandes du restaurant
    console.log('🔍 Recherche commandes pour restaurant_id:', restaurantId);
    
    // DEBUG : Tester d'abord une requête simple pour voir les colonnes disponibles
    console.log('🔍 Test requête simple avec admin...');
    const { data: simpleOrders, error: simpleError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, total, frais_livraison')
      .eq('restaurant_id', restaurantId)
      .limit(1);
    
    console.log('🔍 Résultat requête simple (admin):', simpleOrders?.length || 0, 'commandes');
    console.log('🔍 Erreur requête simple (admin):', simpleError);
    if (simpleOrders && simpleOrders.length > 0) {
      console.log('📊 Exemple commande:', JSON.stringify(simpleOrders[0], null, 2));
    }
    
    // Maintenant la requête complète avec JOIN avec le client admin
    // IMPORTANT: La colonne s'appelle 'total' (pas total_amount) dans la table commandes
    // Utiliser total et frais_livraison uniquement
    // Note: La relation users peut échouer si la foreign key n'existe pas, donc on la rend optionnelle
    let orders = [];
    let ordersError = null;
    
    try {
      // Requête simplifiée - commencer avec les colonnes de base seulement
      // Éviter les colonnes qui pourraient ne pas exister (customer_*, delivery_*)
      const { data: ordersData, error: ordersErrorData } = await supabaseAdmin
        .from('commandes')
        .select(`
          id,
          created_at,
          updated_at,
          statut,
          total,
          frais_livraison,
          restaurant_id,
          user_id,
          livreur_id,
          adresse_livraison,
          preparation_time,
          ready_for_delivery,
          details_commande (
            id,
            plat_id,
            quantite,
            prix_unitaire,
            supplements,
            customizations,
            menus (
              nom,
              prix
            )
          )
        `)
      .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      ordersError = ordersErrorData;
      orders = ordersData || [];

      // Essayer de récupérer les infos users séparément pour éviter les erreurs de relation
      if (orders.length > 0 && !ordersError) {
        const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          try {
            const { data: usersData } = await supabaseAdmin
              .from('users')
              .select('id, nom, prenom, telephone, email')
              .in('id', userIds);
            
            // Mapper les users aux commandes
            if (usersData && usersData.length > 0) {
              const usersMap = new Map(usersData.map(u => [u.id, u]));
              orders = orders.map(order => ({
                ...order,
                users: usersMap.get(order.user_id) || null
              }));
            }
          } catch (userError) {
            console.warn('⚠️ Erreur récupération users (non bloquant):', userError);
            // Continuer sans les données users
          }
        }
      }
    } catch (queryError) {
      console.error('❌ Erreur lors de la requête commandes:', queryError);
      ordersError = queryError;
    }

    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      console.error('❌ Détails erreur:', JSON.stringify(ordersError, null, 2));
      return NextResponse.json({ 
        error: 'Erreur lors de la récupération des commandes',
        details: ordersError.message 
      }, { status: 500 });
    }

    console.log('✅ Commandes trouvées:', orders?.length || 0);

    const formattedOrders = (orders || []).map(order => {
      const subtotal = parseFloat(order.total || 0) || 0;
      const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
      const totalAmount = subtotal + deliveryFee;

      const orderItems = (order.details_commande || []).map(detail => {
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
          id: detail.id,
          plat_id: detail.plat_id,
          name: detail.menus?.nom || 'Article',
          quantity: detail.quantite || 0,
          price: parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0,
          supplements,
          customizations
        };
      });

      const customerFirstName = order.customer_first_name || order.users?.prenom || '';
      const customerLastName = order.customer_last_name || order.users?.nom || '';
      const customerPhone = order.customer_phone || order.users?.telephone || '';
      const customerEmail = order.customer_email || order.users?.email || '';
      
      // Construire le nom complet du client
      const customerName = (customerFirstName && customerLastName) 
        ? `${customerFirstName} ${customerLastName}`.trim()
        : customerLastName || customerFirstName || customerEmail || 'Client';

      return {
        ...order,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        total: subtotal,
        order_items: orderItems,
        items: orderItems, // Alias pour compatibilité
        customer_first_name: customerFirstName,
        customer_last_name: customerLastName,
        customer_name: customerName, // Nom complet formaté
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer: {
          firstName: customerFirstName,
          lastName: customerLastName,
          phone: customerPhone,
          email: customerEmail
        },
        // Ajouter aussi un objet user pour compatibilité avec l'ancien code
        user: order.users ? {
          nom: order.users.nom || customerLastName,
          prenom: order.users.prenom || customerFirstName,
          telephone: order.users.telephone || customerPhone,
          email: order.users.email || customerEmail
        } : null
      };
    });
    
    return NextResponse.json(formattedOrders);

  } catch (error) {
    console.error('Erreur API (orders partner):', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Accepter une commande avec estimation du temps
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!['restaurant', 'partner'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès refusé - Rôle restaurant requis' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, preparationTime, deliveryTime, estimatedTotalTime } = body;

    if (!orderId || !preparationTime || !deliveryTime || !estimatedTotalTime) {
      return NextResponse.json({ 
        error: 'Tous les champs sont requis: orderId, preparationTime, deliveryTime, estimatedTotalTime' 
      }, { status: 400 });
    }

    // Récupérer le restaurant du partenaire
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Vérifier que la commande appartient à ce restaurant
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (order.statut !== 'en_attente') {
      return NextResponse.json({ error: 'Cette commande ne peut plus être modifiée' }, { status: 400 });
    }

    // Mettre à jour la commande avec les estimations de temps
    const { data: updatedOrder, error: updateError } = await supabase
      .from('commandes')
      .update({
        statut: 'acceptee',
        preparation_time: preparationTime,
        delivery_time: deliveryTime,
        estimated_total_time: estimatedTotalTime,
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur mise à jour commande:', updateError);
      return NextResponse.json({ error: 'Erreur lors de l\'acceptation de la commande' }, { status: 500 });
    }

    // Envoyer une notification au client
    try {
      const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(order.user_id);
      if (clientUser) {
        // Ici vous pouvez envoyer une notification push ou email au client
        console.log('Notification envoyée au client:', clientUser.email);
      }
    } catch (notificationError) {
      console.error('Erreur notification client:', notificationError);
    }

    return NextResponse.json({
      message: 'Commande acceptée avec succès',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Erreur API acceptation commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 