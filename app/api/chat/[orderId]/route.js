import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/chat/[orderId] - Récupérer les messages du chat
export async function GET(request, { params }) {
  try {
    const { orderId } = params;
    
    console.log('💬 Récupération messages chat pour commande:', orderId);

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer les messages du chat
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
      return NextResponse.json({ error: 'Erreur récupération messages' }, { status: 500 });
    }

    console.log('✅ Messages récupérés:', messages?.length || 0);

    return NextResponse.json({
      success: true,
      messages: messages || []
    });
  } catch (error) {
    console.error('❌ Erreur API chat:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/chat/[orderId] - Envoyer un message
export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    const { message, user_id } = await request.json();
    
    console.log('💬 Nouveau message pour commande:', orderId);

    if (!message || !user_id) {
      return NextResponse.json({ error: 'Message et user_id requis' }, { status: 400 });
    }

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Enregistrer le message
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert([{
        order_id: orderId,
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
      return NextResponse.json({ error: 'Erreur envoi message' }, { status: 500 });
    }

    console.log('✅ Message envoyé:', newMessage.id);

    return NextResponse.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('❌ Erreur API chat:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
