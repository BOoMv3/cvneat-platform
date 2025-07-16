import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET - Récupérer les commandes du restaurant
export async function GET(request) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un partenaire
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.role.includes('partner')) {
      return NextResponse.json({ error: 'Accès refusé - Rôle partenaire requis' }, { status: 403 });
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

    // Récupérer les commandes du restaurant
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        users!orders_user_id_fkey(nom, prenom, telephone)
      `)
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération commandes:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json(orders || []);
  } catch (error) {
    console.error('Erreur API commandes partenaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Accepter une commande avec estimation du temps
export async function POST(request) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un partenaire
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.role.includes('partner')) {
      return NextResponse.json({ error: 'Accès refusé - Rôle partenaire requis' }, { status: 403 });
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
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    if (order.status !== 'en_attente') {
      return NextResponse.json({ error: 'Cette commande ne peut plus être modifiée' }, { status: 400 });
    }

    // Mettre à jour la commande avec les estimations de temps
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'acceptee',
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