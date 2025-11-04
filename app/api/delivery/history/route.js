import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    console.log('🔍 API delivery/history appelée');
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour email:', user.email);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    console.log('✅ Rôle livreur confirmé');

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { searchParams } = new URL(request.url);
    const deliveryId = user.id; // Utiliser l'ID réel de l'utilisateur connecté
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status'); // Filtre par statut
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('📊 Récupération historique pour livreur:', deliveryId);

    // Construire la requête avec supabaseAdmin pour bypasser RLS
    let query = supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone, ville),
        user_addresses(address, city, postal_code)
      `, { count: 'exact' })
      .eq('livreur_id', deliveryId)
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (status) {
      query = query.eq('statut', status);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('❌ Erreur récupération historique:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'historique', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Commandes récupérées:', orders?.length || 0);

    // Récupérer les informations des clients séparément
    const userIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean) || [])];
    let usersMap = new Map();
    
    if (userIds.length > 0) {
      try {
        const { data: usersData } = await supabaseAdmin
          .from('users')
          .select('id, nom, prenom, telephone, email')
          .in('id', userIds);
        
        if (usersData) {
          usersMap = new Map(usersData.map(u => [u.id, u]));
        }
      } catch (userError) {
        console.warn('⚠️ Erreur récupération users (non bloquant):', userError);
      }
    }

    // Formater les données
    const formattedOrders = orders?.map(order => {
      const userInfo = usersMap.get(order.user_id);
      return {
        id: order.id,
        restaurant_nom: order.restaurant?.nom || 'Restaurant inconnu',
        restaurant_adresse: order.restaurant?.adresse || 'Adresse inconnue',
        customer_name: userInfo ? `${userInfo.prenom || ''} ${userInfo.nom || ''}`.trim() || userInfo.email : 'Client',
        customer_phone: userInfo?.telephone || '',
        delivery_address: order.user_addresses?.address || order.adresse_livraison || 'Adresse non disponible',
        delivery_city: order.user_addresses?.city || '',
        delivery_postal_code: order.user_addresses?.postal_code || '',
        total: parseFloat(order.total || 0) || 0,
        delivery_fee: parseFloat(order.frais_livraison || 0) || 0,
        status: order.statut,
        created_at: order.created_at,
        updated_at: order.updated_at,
        rating: order.note_livreur,
        comment: order.commentaire_livreur
      };
    }) || [];

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('❌ Erreur API historique:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
} 