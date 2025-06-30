import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET /api/delivery/messages/[orderId] - Récupérer les messages d'une commande
export async function GET(request, { params }) {
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

    // Vérifier que la commande appartient au livreur
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.orderId)
      .eq('delivery_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Récupérer les messages
    const { data: messages, error } = await supabase
      .from('delivery_messages')
      .select(`
        *,
        sender:users(full_name, email)
      `)
      .eq('order_id', params.orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(messages || []);
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/delivery/messages/[orderId] - Envoyer un message
export async function POST(request, { params }) {
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

    const { message, messageType = 'text' } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    // Vérifier que la commande appartient au livreur
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        user:users(email, full_name)
      `)
      .eq('id', params.orderId)
      .eq('delivery_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Créer le message
    const { data: newMessage, error } = await supabase
      .from('delivery_messages')
      .insert([{
        order_id: params.orderId,
        sender_id: user.id,
        message,
        message_type: messageType,
        sender_type: 'delivery'
      }])
      .select(`
        *,
        sender:users(full_name, email)
      `)
      .single();

    if (error) throw error;

    // Envoyer notification push au client
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deliveryMessage',
          data: {
            orderId: params.orderId,
            customerName: order.user?.full_name || order.user?.email,
            deliveryName: deliveryUser.full_name || 'Livreur',
            message: message.length > 50 ? message.substring(0, 50) + '...' : message
          },
          recipientEmail: order.user?.email
        })
      });
    } catch (emailError) {
      console.error('Erreur envoi notification message:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Erreur envoi message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/delivery/messages/[orderId] - Marquer les messages comme lus
export async function PUT(request, { params }) {
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

    // Marquer tous les messages comme lus
    const { error } = await supabase
      .from('delivery_messages')
      .update({ read: true })
      .eq('order_id', params.orderId)
      .neq('sender_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Messages marqués comme lus'
    });
  } catch (error) {
    console.error('Erreur marquage messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 