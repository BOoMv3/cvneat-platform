import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
// DÉSACTIVÉ: Remboursements automatiques désactivés
// import { cleanupExpiredOrders } from '../../../../lib/orderCleanup';

// Créer un client avec le service role pour contourner RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return null;
    }
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    // Vérifier le rôle dans la table users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !userData) {
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
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    if (!['restaurant', 'partner'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé - Rôle restaurant requis' }, { status: 403 });
    }

    // Déterminer le restaurant lié à ce compte partenaire
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (restaurantError || !restaurantData?.id) {
      return NextResponse.json({ error: 'Restaurant non trouvé pour ce partenaire' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get('limit');
    const limit = Math.max(1, Math.min(100, parseInt(limitRaw || '50', 10) || 50));

    // 1) Commandes (liste)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select('id, created_at, updated_at, accepted_at, statut, total, frais_livraison, restaurant_id, user_id, livreur_id, adresse_livraison, preparation_time, preparation_started_at, delivery_time, ready_for_delivery, payment_status, loyalty_points_used, loyalty_discount_amount')
      .eq('restaurant_id', restaurantData.id)
      .eq('payment_status', 'paid')
      .not('livreur_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (ordersError) {
      console.error('❌ Erreur récupération commandes partner:', ordersError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 });
    }

    const safeOrders = Array.isArray(orders) ? orders : [];
    const orderIds = safeOrders.map(o => o.id).filter(Boolean);

    // 2) Détails (bulk)
    const detailsByOrderId = new Map();
    if (orderIds.length > 0) {
      const { data: details, error: detailsError } = await supabaseAdmin
        .from('details_commande')
        .select('id, commande_id, plat_id, quantite, prix_unitaire, supplements, customizations, menus ( nom, prix )')
        .in('commande_id', orderIds);

      if (detailsError) {
        console.warn('⚠️ Erreur récupération détails_commande (non bloquant):', detailsError);
      } else if (Array.isArray(details)) {
        for (const d of details) {
          const key = d.commande_id;
          if (!detailsByOrderId.has(key)) detailsByOrderId.set(key, []);
          detailsByOrderId.get(key).push(d);
        }
      }
    }

    // 3) Users (clients + livreurs) en une requête
    const allUserIds = [
      ...new Set(
        safeOrders
          .flatMap(o => [o.user_id, o.livreur_id])
          .filter(Boolean)
      ),
    ];
    const usersMap = new Map();
    if (allUserIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, nom, prenom, telephone, email')
        .in('id', allUserIds);
      if (usersError) {
        console.warn('⚠️ Erreur récupération users (non bloquant):', usersError);
      } else if (Array.isArray(usersData)) {
        usersData.forEach(u => usersMap.set(u.id, u));
      }
    }

    const formattedOrders = safeOrders.map(order => {
      const subtotal = parseFloat(order.total || 0) || 0;
      const deliveryFee = parseFloat(order.frais_livraison || 0) || 0;
      const totalAmount = subtotal + deliveryFee;

      const rawDetails = detailsByOrderId.get(order.id) || [];

      const orderItems = (rawDetails.length > 0 ? rawDetails : [{
        id: `fallback-${order.id}`,
        plat_id: null,
        quantite: 1,
        prix_unitaire: subtotal,
        supplements: null,
        customizations: { is_fallback: true },
        menus: { nom: 'Commande', prix: subtotal },
      }]).map(detail => {
        let supplements = [];
        if (detail.supplements) {
          if (typeof detail.supplements === 'string') {
            try { supplements = JSON.parse(detail.supplements); } catch { supplements = []; }
          } else if (Array.isArray(detail.supplements)) {
            supplements = detail.supplements;
          }
        }

        let customizations = {};
        if (detail.customizations) {
          if (typeof detail.customizations === 'string') {
            try { customizations = JSON.parse(detail.customizations); } catch { customizations = {}; }
          } else if (typeof detail.customizations === 'object') {
            customizations = detail.customizations;
          }
        }

        const price = parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0;

        return {
          id: detail.id,
          plat_id: detail.plat_id,
          name: detail.menus?.nom || 'Article',
          quantity: detail.quantite || 0,
          price,
          supplements,
          customizations,
          quantite: detail.quantite,
          prix_unitaire: detail.prix_unitaire,
          menus: detail.menus,
        };
      });

      const customerUser = order.user_id ? usersMap.get(order.user_id) || null : null;
      const driverUser = order.livreur_id ? usersMap.get(order.livreur_id) || null : null;

      const delivery_driver = driverUser
        ? {
            id: driverUser.id,
            prenom: driverUser.prenom,
            nom: driverUser.nom,
            telephone: driverUser.telephone,
            full_name: `${driverUser.prenom || ''} ${driverUser.nom || ''}`.trim(),
          }
        : null;

      return {
        ...order,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        total: subtotal,
        order_items: orderItems,
        items: orderItems,
        details_commande: rawDetails,
        users: customerUser,
        delivery_driver,
        user: customerUser ? {
          nom: customerUser.nom,
          prenom: customerUser.prenom,
          telephone: customerUser.telephone,
          email: customerUser.email,
        } : null,
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
    const { orderId, preparationTime } = body;

    if (!orderId || !preparationTime) {
      return NextResponse.json({ 
        error: 'Les champs orderId et preparationTime sont requis' 
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

    // NOUVEAU WORKFLOW: Vérifier qu'un livreur a accepté la commande AVANT que le restaurant puisse accepter
    if (!order.livreur_id) {
      return NextResponse.json({ 
        error: 'Aucun livreur disponible', 
        details: 'Cette commande ne peut pas être acceptée car aucun livreur ne l\'a encore acceptée. Veuillez patienter.' 
      }, { status: 400 });
    }

    // Mettre à jour la commande avec le temps de préparation
    // Le temps de livraison est défini par le livreur lors de l'acceptation
    // Le statut passe à 'en_preparation' (statut valide selon les contraintes CHECK)
    const { data: updatedOrder, error: updateError } = await supabase
      .from('commandes')
      .update({
        statut: 'en_preparation', // Statut valide : 'en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee'
        preparation_time: preparationTime,
        preparation_started_at: new Date().toISOString(),
        // delivery_time et estimated_total_time sont définis par le livreur, pas par le restaurant
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