import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET /api/chat-admin/[orderId] - Récupérer les messages du chat (mode admin)
export async function GET(request, { params }) {
  try {
    const { orderId } = params;
    
    console.log('💬 [ADMIN] Récupération messages chat pour commande:', orderId);

    // Récupérer les messages du chat (sans authentification pour l'admin)
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:users(nom, prenom, role)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération messages admin:', error);
      return NextResponse.json({ error: 'Erreur récupération messages' }, { status: 500 });
    }

    console.log('✅ [ADMIN] Messages récupérés:', messages?.length || 0);

    return NextResponse.json({
      success: true,
      messages: messages || []
    });
  } catch (error) {
    console.error('❌ Erreur API chat admin:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/chat-admin/[orderId] - Envoyer un message (mode admin)
export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    const { message, user_id, user_name, user_role } = await request.json();
    
    console.log('💬 [ADMIN] Nouveau message pour commande:', orderId);

    if (!message || !user_id) {
      return NextResponse.json({ error: 'Message et user_id requis' }, { status: 400 });
    }

    // Pour l'admin, on utilise les données fournies directement
    let finalUserId = user_id;

    // Enregistrer le message
    const { data: newMessage, error } = await supabase
      .from('chat_messages')
      .insert([{
        order_id: orderId,
        user_id: finalUserId,
        message: message
      }])
      .select(`
        *,
        user:users(nom, prenom, role)
      `)
      .single();

    if (error) {
      console.error('❌ Erreur envoi message admin:', error);
      return NextResponse.json({ error: 'Erreur envoi message' }, { status: 500 });
    }

    console.log('✅ [ADMIN] Message envoyé:', newMessage.id);

    return NextResponse.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('❌ Erreur API chat admin:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
