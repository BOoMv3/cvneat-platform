import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Récupérer les messages d'une commande
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID de commande requis' },
        { status: 400 }
      );
    }

    const { data: messages, error } = await supabase
      .from('delivery_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération messages:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error) {
    console.error('Erreur API messages:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Envoyer un nouveau message
export async function POST(request) {
  try {
    const body = await request.json();
    const { order_id, message, sender_type } = body;

    if (!order_id || !message || !sender_type) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    const { data: newMessage, error } = await supabase
      .from('delivery_messages')
      .insert({
        order_id,
        message,
        sender_type,
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

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Erreur API envoi message:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 