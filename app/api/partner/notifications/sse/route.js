import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import sseBroadcaster from '../../../../../lib/sse-broadcast';

async function getUserFromRequest(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) return null;
    
    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    // IMPORTANT: les requêtes DB ci-dessous doivent bypass RLS (supabase server-side anon n'a pas le contexte du token)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return null;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Vérifier le rôle dans la table users (service role)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) return null;

    return { ...user, role: userData.role, supabaseAdmin };
  } catch (error) {
    console.error('Erreur authentification:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    // Pour SSE, on accepte le token en paramètre d'URL car EventSource ne supporte pas les headers
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const restaurantId = searchParams.get('restaurantId');
    
    console.log('🔍 DEBUG SSE - Token:', token ? 'Présent' : 'Absent');
    console.log('🔍 DEBUG SSE - RestaurantId:', restaurantId);
    
    if (!token) {
      console.error('❌ Aucun token fourni pour SSE');
      return NextResponse.json({ error: 'Token requis' }, { status: 401 });
    }
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('🔍 DEBUG SSE - User:', user ? user.id : 'Aucun utilisateur');
    console.log('🔍 DEBUG SSE - AuthError:', authError);
    
    if (authError || !user) {
      console.error('❌ Token invalide pour SSE:', authError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Vérifier le rôle (service role)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log('🔍 DEBUG SSE - UserData:', userData);
    
    if (userError || !userData || userData.role !== 'restaurant') {
      console.error('❌ Rôle invalide pour SSE:', userError);
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer l'ID du restaurant associé à l'utilisateur partenaire
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurantData) {
      return NextResponse.json({ error: 'Restaurant non trouvé pour ce partenaire' }, { status: 404 });
    }

    const userRestaurantId = restaurantData.id;
    console.log('✅ SSE - Restaurant ID trouvé:', userRestaurantId);
    console.log('✅ SSE - Restaurant ID param:', restaurantId);

    // Vérifier que restaurantId correspond
    if (restaurantId && restaurantId !== userRestaurantId) {
      console.warn('⚠️ SSE - Restaurant ID mismatch:', { param: restaurantId, user: userRestaurantId });
    }

    // Configuration SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        console.log('✅ SSE Stream démarré');
        
        // Envoyer un message de connexion
        const connectMessage = { type: 'connected', message: 'Connexion SSE établie', restaurantId: userRestaurantId };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectMessage)}\n\n`));
        console.log('✅ Message de connexion SSE envoyé');

        // Fonction pour envoyer des notifications
        const sendNotification = (data) => {
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
            console.log('✅ Notification SSE envoyée:', data.type);
          } catch (error) {
            console.error('❌ Erreur envoi notification SSE:', error);
          }
        };

        // Enregistrer ce client dans le broadcaster
        const removeClient = sseBroadcaster.addClient(userRestaurantId, controller);
        console.log(`✅ Client SSE enregistré dans broadcaster pour restaurant ${userRestaurantId}`);

        // Optionnel : Essayer aussi Supabase Realtime (peut ne pas fonctionner en serverless)
        try {
          console.log('🔍 SSE - Tentative configuration Supabase Realtime pour restaurant:', userRestaurantId);
          const channel = supabase
            .channel(`restaurant_${userRestaurantId}_orders`)
            .on('postgres_changes', 
              { 
                event: 'UPDATE', // NOUVEAU WORKFLOW: On écoute UPDATE car le restaurant est notifié quand un livreur accepte
                schema: 'public', 
                table: 'commandes',
                filter: `restaurant_id=eq.${userRestaurantId}`
              }, 
              (payload) => {
                console.log('🔔 Commande mise à jour via Supabase Realtime:', payload.new.id);
                
                // IMPORTANT: Vérifier que la commande est payée avant d'envoyer la notification
                if (payload.new.payment_status !== 'paid' && payload.new.payment_status !== 'succeeded') {
                  console.log('⚠️ Commande non payée ignorée dans SSE:', payload.new.id, 'payment_status:', payload.new.payment_status);
                  return; // Ne pas envoyer de notification pour les commandes non payées
                }
                
                // Retrait sur place : notifier dès paiement. Livraison : quand livreur assigné.
                const isPickup = String(payload.new.order_fulfillment || 'delivery').toLowerCase() === 'pickup';
                const oldHasDelivery = payload.old?.livreur_id === null || payload.old?.livreur_id === undefined;
                const newHasDelivery = payload.new.livreur_id !== null && payload.new.livreur_id !== undefined;
                const paymentJustPaid =
                  (payload.old?.payment_status !== 'paid' && payload.old?.payment_status !== 'succeeded') &&
                  (payload.new.payment_status === 'paid' || payload.new.payment_status === 'succeeded');

                if (isPickup && paymentJustPaid && payload.new.statut === 'en_attente') {
                  console.log('✅ Nouvelle commande retrait payée, notification envoyée:', payload.new.id);
                  const totalWithDelivery = (parseFloat(payload.new.total || 0) + parseFloat(payload.new.frais_livraison || 0)).toFixed(2);
                  sendNotification({
                    type: 'new_order',
                    message: `Nouvelle commande retrait #${payload.new.id?.slice(0, 8) || 'N/A'} - ${totalWithDelivery}€`,
                    order: payload.new,
                    timestamp: new Date().toISOString()
                  });
                } else if (oldHasDelivery && newHasDelivery && payload.new.statut === 'en_attente') {
                  console.log('✅ Nouvelle commande avec livreur assigné, notification envoyée:', payload.new.id);
                  const totalWithDelivery = (parseFloat(payload.new.total || 0) + parseFloat(payload.new.frais_livraison || 0)).toFixed(2);
                  sendNotification({
                    type: 'new_order',
                    message: `Nouvelle commande #${payload.new.id?.slice(0, 8) || 'N/A'} - ${totalWithDelivery}€ (Livreur assigné)`,
                    order: payload.new,
                    timestamp: new Date().toISOString()
                  });
                } else {
                  console.log('⚠️ Commande ignorée (pas retrait payé ni nouveau livreur):', payload.new.id, 'fulfillment:', payload.new.order_fulfillment, 'statut:', payload.new.statut);
                }
              }
            )
            .subscribe((status) => {
              console.log('🔍 SSE - Statut abonnement Supabase:', status);
              if (status === 'SUBSCRIBED') {
                console.log('✅ Abonnement Supabase Realtime actif');
              } else if (status === 'CHANNEL_ERROR') {
                console.warn('⚠️ Supabase Realtime non disponible (normal en serverless), utilisation du broadcaster');
              }
            });
        } catch (realtimeError) {
          console.warn('⚠️ Erreur Supabase Realtime (normal en serverless):', realtimeError.message);
        }

        // Nettoyer la connexion
        request.signal.addEventListener('abort', () => {
          console.log('🧹 SSE - Nettoyage connexion');
          removeClient(); // Supprimer du broadcaster
          if (typeof channel !== 'undefined' && channel) {
            channel.unsubscribe();
          }
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