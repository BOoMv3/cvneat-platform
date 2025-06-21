import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get('restaurantId');

  if (!restaurantId) {
    return NextResponse.json({ error: 'Restaurant ID requis' }, { status: 400 });
  }

  // Créer une réponse SSE
  const stream = new ReadableStream({
    start(controller) {
      const sendNotification = (data) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      };

      // Envoyer une notification de connexion
      sendNotification({
        type: 'connection',
        message: 'Connecté aux notifications',
        timestamp: new Date().toISOString()
      });

      // Vérifier les nouvelles commandes toutes les 30 secondes
      const checkNewOrders = async () => {
        try {
          const { data: newOrders, error } = await supabase
            .from('commandes')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('statut', 'en_attente')
            .gte('created_at', new Date(Date.now() - 30000).toISOString());

          if (!error && newOrders && newOrders.length > 0) {
            newOrders.forEach(order => {
              sendNotification({
                type: 'new_order',
                order: order,
                message: `Nouvelle commande #${order.id}`,
                timestamp: new Date().toISOString()
              });
            });
          }
        } catch (error) {
          console.error('Erreur vérification nouvelles commandes:', error);
        }
      };

      // Vérifier immédiatement puis toutes les 30 secondes
      checkNewOrders();
      const interval = setInterval(checkNewOrders, 30000);

      // Nettoyer l'intervalle quand la connexion se ferme
      return () => {
        clearInterval(interval);
      };
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
} 