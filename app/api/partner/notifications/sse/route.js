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
    
    // Vérifier le rôle
    const { data: userData, error: userError } = await supabase
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
    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurantData) {
      return NextResponse.json({ error: 'Restaurant non trouvé pour ce partenaire' }, { status: 404 });
    }

    const userRestaurantId = restaurantData.id;

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
          .channel(`restaurant_${userRestaurantId}_orders`)
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'commandes',
              filter: `restaurant_id=eq.${userRestaurantId}`
            }, 
            (payload) => {
              console.log('🔔 Nouvelle commande détectée via SSE:', payload.new.id);
              sendNotification({
                type: 'new_order',
                message: `Nouvelle commande #${payload.new.id?.slice(0, 8) || 'N/A'} - ${payload.new.total || 0}€`,
                order: payload.new,
                timestamp: new Date().toISOString()
              });
            }
          )
          .on('postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'commandes',
              filter: `restaurant_id=eq.${userRestaurantId}`
            },
            (payload) => {
              console.log('🔄 Commande mise à jour via SSE:', payload.new.id);
              sendNotification({
                type: 'order_updated',
                message: `Commande #${payload.new.id?.slice(0, 8) || 'N/A'} mise à jour`,
                order: payload.new,
                timestamp: new Date().toISOString()
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