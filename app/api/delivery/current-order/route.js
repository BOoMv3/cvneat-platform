import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/delivery/current-order - Récupérer la commande en cours du livreur
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est livreur
    const { data: deliveryUser, error: deliveryError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (deliveryError || deliveryUser.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer la commande en cours
    const { data: currentOrder, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(email, full_name, telephone),
        restaurant:restaurants(nom, adresse, telephone, latitude, longitude)
      `)
      .eq('delivery_id', user.id)
      .in('status', ['accepted', 'in_delivery'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      hasOrder: !!currentOrder,
      order: currentOrder || null
    });
  } catch (error) {
    console.error('Erreur récupération commande en cours:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/delivery/current-order - Mettre à jour la position GPS du livreur
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est livreur
    const { data: deliveryUser, error: deliveryError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (deliveryError || deliveryUser.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { latitude, longitude, orderId } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Coordonnées GPS requises' }, { status: 400 });
    }

    // Mettre à jour la position du livreur
    const { error: updateError } = await supabase
      .from('users')
      .update({
        latitude,
        longitude,
        last_location_update: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // Si une commande est spécifiée, mettre à jour sa position
    if (orderId) {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          delivery_latitude: latitude,
          delivery_longitude: longitude,
          delivery_location_updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('delivery_id', user.id);

      if (orderUpdateError) throw orderUpdateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Position mise à jour'
    });
  } catch (error) {
    console.error('Erreur mise à jour position:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/delivery/current-order - Mettre à jour le statut de livraison
export async function PUT(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est livreur
    const { data: deliveryUser, error: deliveryError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (deliveryError || deliveryUser.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { orderId, status, notes } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'ID commande et statut requis' }, { status: 400 });
    }

    // Vérifier que la commande appartient au livreur
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('delivery_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Mettre à jour le statut
    const updateData = { status };
    if (notes) updateData.delivery_notes = notes;

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        user:users(email, full_name),
        restaurant:restaurants(nom)
      `)
      .single();

    if (updateError) throw updateError;

    // Envoyer notification au client
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deliveryStatusUpdate',
          data: {
            orderId: updatedOrder.id,
            customerName: updatedOrder.user?.full_name || updatedOrder.user?.email,
            status,
            deliveryName: deliveryUser.full_name || 'Livreur'
          },
          recipientEmail: updatedOrder.user?.email
        })
      });
    } catch (emailError) {
      console.error('Erreur envoi email statut livraison:', emailError);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Erreur mise à jour statut livraison:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 