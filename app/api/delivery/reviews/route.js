import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET: Récupérer les avis d'un livreur
export async function GET(request) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est livreur
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || userData.role !== 'delivery') {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle livreur requis' },
        { status: 403 }
      );
    }

    // Récupérer les paramètres de pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Récupérer les avis pour ce livreur avec les détails de la commande
    const { data: ratings, error: ratingsError, count } = await supabaseAdmin
      .from('delivery_ratings')
      .select(`
        *,
        order:commandes!inner(
          id,
          created_at,
          total,
          restaurant:restaurants(nom, id)
        ),
        customer:users!delivery_ratings_user_id_fkey(id, prenom, nom, email)
      `, { count: 'exact' })
      .eq('livreur_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ratingsError) {
      console.error('Erreur récupération avis:', ratingsError);
      return NextResponse.json(
        { error: 'Erreur serveur' },
        { status: 500 }
      );
    }

    // Formater les données pour la réponse
    const reviews = (ratings || []).map(rating => ({
      id: rating.order?.id || rating.order_id,
      rating: rating.rating,
      comment: rating.comment,
      date: rating.created_at,
      customer_name: rating.customer 
        ? `${rating.customer.prenom || ''} ${rating.customer.nom || ''}`.trim() || 'Client anonyme'
        : 'Client anonyme',
      restaurant_name: rating.order?.restaurant?.nom || 'Restaurant',
      restaurant_id: rating.order?.restaurant?.id || null,
      order_total: rating.order?.total || null,
      order_date: rating.order?.created_at || null
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    console.error('Erreur API reviews:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
