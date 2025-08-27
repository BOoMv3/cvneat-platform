import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId requis' }, { status: 400 });
    }

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est le propriétaire du restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', restaurantId)
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant non trouvé ou non autorisé' }, { status: 403 });
    }

    // Configuration SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Envoyer un message de connexion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connection',
          message: 'Connexion SSE établie'
        })}\n\n`));

        // Fonction pour envoyer des notifications
        const sendNotification = (data) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Écouter les nouvelles commandes
        const ordersSubscription = supabase
          .channel(`orders-${restaurantId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`
          }, (payload) => {
            sendNotification({
              type: 'new_order',
              order: payload.new,
              message: 'Nouvelle commande reçue !'
            });
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`
          }, (payload) => {
            sendNotification({
              type: 'order_update',
              order: payload.new,
              oldOrder: payload.old,
              message: 'Commande mise à jour'
            });
          })
          .subscribe();

        // Écouter les messages de livraison
        const deliverySubscription = supabase
          .channel(`delivery-${restaurantId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'delivery_messages',
            filter: `restaurant_id=eq.${restaurantId}`
          }, (payload) => {
            sendNotification({
              type: 'delivery_message',
              message: payload.new,
              text: 'Message de livraison reçu'
            });
          })
          .subscribe();

        // Nettoyer les souscriptions à la fermeture
        request.signal.addEventListener('abort', () => {
          ordersSubscription.unsubscribe();
          deliverySubscription.unsubscribe();
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
    console.error('Erreur SSE notifications:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 