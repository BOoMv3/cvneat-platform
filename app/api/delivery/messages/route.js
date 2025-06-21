import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID commande requis' },
        { status: 400 }
      );
    }

    // Récupérer les messages pour cette commande
    const { data: messages, error } = await supabase
      .from('delivery_messages')
      .select(`
        *,
        users(nom, prenom)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération messages:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des messages' },
        { status: 500 }
      );
    }

    return NextResponse.json(messages || []);
  } catch (error) {
    console.error('Erreur API messages:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { orderId, message, senderType } = await request.json();
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel

    if (!orderId || !message || !senderType) {
      return NextResponse.json(
        { error: 'ID commande, message et type d\'expéditeur requis' },
        { status: 400 }
      );
    }

    // Vérifier que la commande appartient au livreur
    const { data: order, error: orderError } = await supabase
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .eq('livreur_id', deliveryId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée ou non autorisée' },
        { status: 403 }
      );
    }

    // Créer le message
    const { data: newMessage, error } = await supabase
      .from('delivery_messages')
      .insert({
        order_id: orderId,
        sender_id: deliveryId,
        sender_type: senderType, // 'delivery' ou 'customer'
        message: message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création message:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi du message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Erreur API envoi message:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 