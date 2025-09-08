import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// API de chat simplifiée pour debug (sans RLS)
export async function GET(request, { params }) {
  try {
    const { orderId } = params;
    
    console.log('💬 DEBUG - Récupération messages chat pour commande:', orderId);

    // Récupérer les messages du chat (sans RLS)
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:users(nom, prenom, role)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération messages:', error);
      return NextResponse.json({ error: 'Erreur récupération messages', details: error }, { status: 500 });
    }

    console.log('✅ Messages récupérés:', messages?.length || 0);

    return NextResponse.json({
      success: true,
      messages: messages || []
    });
  } catch (error) {
    console.error('❌ Erreur API chat debug:', error);
    return NextResponse.json({ error: 'Erreur serveur', details: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    const { message, user_id } = await request.json();
    
    console.log('💬 DEBUG - Nouveau message pour commande:', orderId);
    console.log('💬 DEBUG - Message:', message);
    console.log('💬 DEBUG - User ID:', user_id);

    if (!message || !user_id) {
      return NextResponse.json({ error: 'Message et user_id requis' }, { status: 400 });
    }

    // Enregistrer le message (sans RLS)
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert([{
        order_id: parseInt(orderId),
        user_id: user_id,
        message: message,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        user:users(nom, prenom, role)
      `)
      .single();

    if (error) {
      console.error('❌ Erreur envoi message:', error);
      return NextResponse.json({ 
        error: 'Erreur envoi message', 
        details: error,
        orderId: orderId,
        user_id: user_id
      }, { status: 500 });
    }

    console.log('✅ Message envoyé:', newMessage.id);

    return NextResponse.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('❌ Erreur API chat debug:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur', 
      details: error.message 
    }, { status: 500 });
  }
}
