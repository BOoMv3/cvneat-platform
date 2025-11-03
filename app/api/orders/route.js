import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
const { sanitizeInput, isValidAmount, isValidId } = require('@/lib/validation');

// GET /api/orders - Récupérer les commandes de l'utilisateur
export async function GET(request) {
  try {
    // Récupérer le token depuis les headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Créer un client admin pour bypasser RLS si nécessaire
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Récupérer les commandes de l'utilisateur avec les détails (utiliser admin pour bypasser RLS)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('commandes')
      .select(`
        id,
        created_at,
        updated_at,
        statut,
        total,
        frais_livraison,
        adresse_livraison,
        restaurant_id,
        details_commande (
          id,
          quantite,
          prix_unitaire,
          menus (
            nom,
            prix
          )
        ),
        restaurants (
          id,
          nom,
          adresse,
          ville
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 });
    }

    // Formater les données pour le frontend
    const formattedOrders = (orders || []).map(order => {
      const restaurant = order.restaurants;
      const items = (order.details_commande || []).map(detail => ({
        id: detail.id,
        name: detail.menus?.nom || 'Article',
        quantity: detail.quantite || 0,
        price: parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0
      }));

      // Extraire l'adresse de livraison
      const addressParts = (order.adresse_livraison || '').split(',').map(s => s.trim());
      const deliveryAddress = addressParts[0] || '';
      const deliveryCity = addressParts.length > 2 ? addressParts[1] : (addressParts[1] || '');
      const deliveryPostalCode = addressParts.length > 2 ? addressParts[2]?.split(' ')[0] : '';

      return {
        id: order.id,
        restaurantName: restaurant?.nom || 'Restaurant inconnu',
        status: order.statut, // Utiliser statut (français)
        total: parseFloat(order.total || 0) || 0,
        deliveryFee: parseFloat(order.frais_livraison || 0) || 0,
        deliveryAddress: deliveryAddress,
        deliveryCity: deliveryCity,
        deliveryPostalCode: deliveryPostalCode,
        createdAt: order.created_at,
        items: items
      };
    });

    return NextResponse.json(formattedOrders);

  } catch (error) {
    console.error('Erreur dans /api/orders:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/orders - Créer une nouvelle commande
export async function POST(request) {
  try {
    console.log('=== DÉBUT CRÉATION COMMANDE ===');
    
    const body = await request.json();
    console.log('Donnees recues:', JSON.stringify(body, null, 2));
    
    const { restaurantId, deliveryInfo, items, deliveryFee, totalAmount } = body;

    // 1. VALIDATION SIMPLIFIÉE - SEULEMENT LES BASES
    console.log('🔍 Validation simplifiée de la commande...');
    
    // Validation de base seulement
    console.log('✅ Validation de base OK - Restaurant et articles validés');
    
    console.log('Restaurant ID recu:', restaurantId);
    console.log('Type du restaurant ID:', typeof restaurantId);
    console.log('Frais de livraison recus:', deliveryFee);
    console.log('Montant total recu:', totalAmount);

    // Validation des donnees
    if (!restaurantId || !items || items.length === 0) {
      console.log('Validation echouee: donnees manquantes');
      return NextResponse.json(
        { error: 'Donnees de commande invalides' },
        { status: 400 }
      );
    }

    // Validation et sanitisation des données
    if (!isValidId(restaurantId)) {
      return NextResponse.json(
        { error: 'ID restaurant invalide' },
        { status: 400 }
      );
    }

    if (!isValidAmount(totalAmount) || !isValidAmount(deliveryFee)) {
      return NextResponse.json(
        { error: 'Montant invalide' },
        { status: 400 }
      );
    }

    // Sanitisation des informations de livraison
    const sanitizedDeliveryInfo = {
      address: sanitizeInput(deliveryInfo?.address || ''),
      city: sanitizeInput(deliveryInfo?.city || ''),
      postalCode: sanitizeInput(deliveryInfo?.postalCode || ''),
      instructions: sanitizeInput(deliveryInfo?.instructions || '')
    };

    console.log('Validation des donnees OK');

    // Verifier que le restaurant existe
    console.log('Verification du restaurant ID:', restaurantId);
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) {
      console.error('Erreur restaurant:', restaurantError);
      return NextResponse.json(
        { error: 'Restaurant invalide' },
        { status: 400 }
      );
    }

    if (!restaurant) {
      console.log('Restaurant non trouve');
      return NextResponse.json(
        { error: 'Restaurant invalide' },
        { status: 400 }
      );
    }

    console.log('Restaurant trouve:', restaurant.nom);

    // Verifier que tous les articles existent
    console.log('Verification des articles...');
    for (const item of items) {
      console.log('Verification article ID:', item.id);
      const { data: menuItem, error: menuError } = await supabase
        .from('menus')
        .select('*')
        .eq('id', item.id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (menuError) {
        console.error('Erreur menu item:', menuError);
        return NextResponse.json(
          { error: 'Un ou plusieurs articles ne sont pas disponibles' },
          { status: 400 }
        );
      }

      if (!menuItem) {
        console.log('Article non trouve:', item.id);
        return NextResponse.json(
          { error: 'Un ou plusieurs articles ne sont pas disponibles' },
          { status: 400 }
        );
      }
    }

    console.log('Tous les articles sont valides');

    // Utiliser le montant total et les frais de livraison envoyes par le frontend
    const total = totalAmount || 0;
    const fraisLivraison = deliveryFee || restaurant.frais_livraison || 0;

    console.log('Total utilise:', total);
    console.log('Frais de livraison utilises:', fraisLivraison);

    // Générer un code de sécurité à 6 chiffres pour la livraison
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Code de sécurité généré pour la commande');

    // Récupérer l'utilisateur si connecté
    const authHeader = request.headers.get('authorization');
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
        console.log('✅ Utilisateur connecté pour la commande:', user.email);
      }
    }

    // Creer la commande dans Supabase
    console.log('Tentative de creation de la commande...');
    const orderData = {
      restaurant_id: restaurantId,
      adresse_livraison: `${deliveryInfo.address}, ${deliveryInfo.city} ${deliveryInfo.postalCode}`,
      total: total,
      frais_livraison: fraisLivraison,
      statut: 'en_attente', // En attente d'acceptation par le restaurant
      security_code: securityCode // Code de sécurité pour la livraison
    };
    
    // Ajouter user_id si l'utilisateur est connecté
    if (userId) {
      orderData.user_id = userId;
    }

    console.log('Donnees de commande a inserer:', JSON.stringify(orderData, null, 2));

    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .insert([orderData])
      .select()
      .single();

    if (orderError) {
      console.error('Erreur lors de la création de la commande:', orderError);
      return NextResponse.json(
        { error: `Erreur lors de la création de la commande: ${orderError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Commande créée avec succès:', order.id);
    
    // Envoyer une notification SSE au restaurant via le broadcaster
    try {
      const notificationSent = sseBroadcaster.broadcast(restaurantId, {
        type: 'new_order',
        message: `Nouvelle commande #${order.id?.slice(0, 8) || 'N/A'} - ${order.total || 0}€`,
        order: order,
        timestamp: new Date().toISOString()
      });
      console.log('🔔 Notification SSE envoyée:', notificationSent ? 'Oui' : 'Non (aucun client connecté)');
    } catch (broadcastError) {
      console.warn('⚠️ Erreur broadcasting SSE:', broadcastError);
      // Ne pas faire échouer la création de commande si le broadcast échoue
    }
    console.log('📊 Statut initial de la commande:', order.statut);
    console.log('📅 Heure de création:', order.created_at);

    // Créer les détails de commande
    console.log('Création des détails de commande...');
    const orderDetails = items.map(item => ({
      commande_id: order.id,
      plat_id: item.id,
      quantite: item.quantity,
      prix_unitaire: item.price
    }));

    const { error: detailsError } = await supabase
      .from('details_commande')
      .insert(orderDetails);

    if (detailsError) {
      console.error('Erreur création détails commande:', detailsError);
      // Ne pas échouer la commande pour ça, juste logger
    } else {
      console.log('Détails de commande créés avec succès');
    }

    console.log('🎯 RETOUR DE LA RÉPONSE - Commande créée avec statut:', order.statut);
    
    return NextResponse.json({
      message: 'Commande créée avec succès',
      orderId: order.id,
      total: total,
      status: order.statut, // Utiliser le statut réel de la commande
      debug: {
        orderCreatedAt: order.created_at,
        orderStatus: order.statut,
        orderId: order.id
      }
    });

  } catch (error) {
    console.error('Erreur générale lors de la création de la commande:', error);
    return NextResponse.json(
      { error: `Erreur lors de la création de la commande: ${error.message}` },
      { status: 500 }
    );
  }
} 