import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

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

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Pour l'instant, retourner des messages vides car la table chat_messages n'existe pas
    // TODO: Créer la table chat_messages si nécessaire
    console.log('💬 Chat non implémenté - retour messages vides');
    
    return NextResponse.json({
      success: true,
      messages: []
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

    // Pour l'instant, simuler l'envoi d'un message car la table chat_messages n'existe pas
    // TODO: Créer la table chat_messages si nécessaire
    console.log('💬 Envoi message non implémenté - simulation');
    
    const simulatedMessage = {
      id: Date.now(),
      order_id: orderId,
      user_id: user_id,
      message: message,
      created_at: new Date().toISOString(),
      user: {
        nom: 'Livreur',
        prenom: 'Test',
        role: 'delivery'
      }
    };

    return NextResponse.json({
      success: true,
      message: simulatedMessage
    });
  } catch (error) {
    console.error('❌ Erreur API chat:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
