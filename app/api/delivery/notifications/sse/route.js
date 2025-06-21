import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const deliveryId = searchParams.get('deliveryId');

  if (!deliveryId) {
    return NextResponse.json({ error: 'ID livreur requis' }, { status: 400 });
  }

  // SSE
  const stream = new ReadableStream({
    start(controller) {
      const sendNotification = (data) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      };

      // Notification de connexion
      sendNotification({
        type: 'connection',
        message: 'Connecté aux notifications livreur',
        timestamp: new Date().toISOString()
      });

      // Vérifier toutes les 20s les nouvelles commandes à prendre ou changements de statut
      let lastCheck = new Date();
      const checkNotifications = async () => {
        try {
          // Nouvelles commandes disponibles
          const { data: availableOrders } = await supabase
            .from('commandes')
            .select('*')
            .eq('statut', 'pret_a_livrer')
            .is('livreur_id', null)
            .gte('created_at', new Date(Date.now() - 20000).toISOString());

          if (availableOrders && availableOrders.length > 0) {
            availableOrders.forEach(order => {
              sendNotification({
                type: 'new_order',
                order,
                message: `Nouvelle commande à livrer (#${order.id})`,
                timestamp: new Date().toISOString()
              });
            });
          }

          // Changement de statut sur commandes du livreur
          const { data: myOrders } = await supabase
            .from('commandes')
            .select('*')
            .eq('livreur_id', deliveryId)
            .gte('updated_at', lastCheck.toISOString());

          if (myOrders && myOrders.length > 0) {
            myOrders.forEach(order => {
              sendNotification({
                type: 'order_status',
                order,
                message: `Statut de la commande #${order.id} : ${order.statut}`,
                timestamp: new Date().toISOString()
              });
            });
          }

          lastCheck = new Date();
        } catch (error) {
          console.error('Erreur notifications livreur:', error);
        }
      };

      checkNotifications();
      const interval = setInterval(checkNotifications, 20000);
      return () => clearInterval(interval);
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