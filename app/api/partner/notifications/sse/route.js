import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

async function getUserFromRequest(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return null;
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // Vérifier le rôle dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) return null;

    return { ...user, role: userData.role };
  } catch (error) {
    console.error('Erreur authentification:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    if (user.role !== 'restaurant') {
      return NextResponse.json({ error: 'Accès non autorisé - Rôle restaurant requis' }, { status: 403 });
    }

    // Récupérer l'ID du restaurant associé à l'utilisateur partenaire
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurantData) {
      return NextResponse.json({ error: 'Restaurant non trouvé pour ce partenaire' }, { status: 404 });
    }

    const restaurantId = restaurantData.id;

    // Configuration SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Envoyer un message de connexion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Connexion SSE établie' })}\n\n`));

        // Fonction pour envoyer des notifications
        const sendNotification = (data) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Écouter les nouvelles commandes
        const channel = supabase
          .channel(`restaurant_${restaurantId}_orders`)
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'commandes',
              filter: `restaurant_id=eq.${restaurantId}`
            }, 
            (payload) => {
              sendNotification({
                type: 'new_order',
                order: payload.new
              });
            }
          )
          .on('postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'commandes',
              filter: `restaurant_id=eq.${restaurantId}`
            },
            (payload) => {
              sendNotification({
                type: 'order_updated',
                order: payload.new
              });
            }
          )
          .subscribe();

        // Nettoyer la connexion
        request.signal.addEventListener('abort', () => {
          channel.unsubscribe();
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('Erreur API (notifications SSE):', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 