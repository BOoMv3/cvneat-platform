import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

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

    // Récupérer les commandes sans jointure pour éviter les erreurs
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Erreur lors de la récupération des commandes:', ordersError);
      return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 });
    }

    // Récupérer les restaurants séparément
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, nom, adresse, ville');

    if (restaurantsError) {
      console.error('Erreur lors de la récupération des restaurants:', restaurantsError);
    }

    // Créer un map des restaurants pour un accès rapide
    const restaurantsMap = {};
    if (restaurants) {
      restaurants.forEach(restaurant => {
        restaurantsMap[restaurant.id] = restaurant;
      });
    }

    // Formater les données pour le frontend
    const formattedOrders = orders.map(order => {
      const restaurant = restaurantsMap[order.restaurant_id];
      return {
        id: order.id,
        restaurantName: restaurant?.nom || 'Restaurant inconnu',
        status: order.status,
        total: order.total_amount,
        deliveryAddress: order.delivery_address,
        deliveryCity: order.delivery_city,
        deliveryPostalCode: order.delivery_postal_code,
        createdAt: order.created_at,
        items: order.items || []
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
    console.log('Données reçues:', JSON.stringify(body, null, 2));
    
    const { restaurantId, deliveryInfo, items } = body;
    
    console.log('Restaurant ID reçu:', restaurantId);
    console.log('Type du restaurant ID:', typeof restaurantId);

    // Validation des données
    if (!restaurantId || !items || items.length === 0) {
      console.log('Validation échouée: données manquantes');
      return NextResponse.json(
        { error: 'Données de commande invalides' },
        { status: 400 }
      );
    }

    console.log('Validation des données OK');

    // Vérifier que le restaurant existe
    console.log('Vérification du restaurant ID:', restaurantId);
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
      console.log('Restaurant non trouvé');
      return NextResponse.json(
        { error: 'Restaurant invalide' },
        { status: 400 }
      );
    }

    console.log('Restaurant trouvé:', restaurant.name);

    // Vérifier que tous les articles existent
    console.log('Vérification des articles...');
    for (const item of items) {
      console.log('Vérification article ID:', item.id);
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
        console.log('Article non trouvé:', item.id);
        return NextResponse.json(
          { error: 'Un ou plusieurs articles ne sont pas disponibles' },
          { status: 400 }
        );
      }
    }

    console.log('Tous les articles sont valides');

    // Calculer le total de la commande
    let total = 0;
    for (const item of items) {
      const { data: menuItem } = await supabase
        .from('menus')
        .select('prix')
        .eq('id', item.id)
        .single();
      
      if (menuItem) {
        total += menuItem.prix * item.quantity;
      }
    }

    // Ajouter les frais de livraison
    total += restaurant.frais_livraison || 0;

    console.log('Total calculé:', total);

    // Créer la commande dans Supabase
    console.log('Tentative de création de la commande...');
    const orderData = {
      restaurant_id: restaurantId,
      customer_name: deliveryInfo.name,
      customer_phone: deliveryInfo.phone,
      delivery_address: deliveryInfo.address,
      delivery_city: deliveryInfo.city,
      delivery_postal_code: deliveryInfo.postalCode,
      delivery_instructions: deliveryInfo.instructions || '',
      total_amount: total,
      delivery_fee: restaurant.frais_livraison || 0,
      status: 'pending', // En attente d'acceptation par le restaurant
      items: items // Stocker les articles comme JSON
    };

    console.log('Données de commande à insérer:', JSON.stringify(orderData, null, 2));

    const { data: order, error: orderError } = await supabase
      .from('orders')
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

    console.log('Commande créée avec succès:', order.id);

    return NextResponse.json({
      message: 'Commande créée avec succès',
      orderId: order.id,
      total: total,
      status: 'pending'
    });

  } catch (error) {
    console.error('Erreur générale lors de la création de la commande:', error);
    return NextResponse.json(
      { error: `Erreur lors de la création de la commande: ${error.message}` },
      { status: 500 }
    );
  }
} 