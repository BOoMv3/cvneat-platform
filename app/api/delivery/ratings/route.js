import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST: Soumettre une note pour un livreur
export async function POST(request) {
  try {
    const body = await request.json();
    const { order_id, rating, comment } = body;

    // Validation
    if (!order_id || !rating) {
      return NextResponse.json(
        { error: 'order_id et rating sont requis' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'La note doit être entre 1 et 5' },
        { status: 400 }
      );
    }

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

    // Vérifier que la commande existe, est livrée, et appartient à l'utilisateur
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('id, statut, user_id, livreur_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez noter que vos propres commandes' },
        { status: 403 }
      );
    }

    if (order.statut !== 'livree') {
      return NextResponse.json(
        { error: 'Vous ne pouvez noter que les commandes livrées' },
        { status: 400 }
      );
    }

    if (!order.livreur_id) {
      return NextResponse.json(
        { error: 'Aucun livreur assigné à cette commande' },
        { status: 400 }
      );
    }

    // Vérifier si une note existe déjà pour cette commande
    const { data: existingRating, error: checkError } = await supabaseAdmin
      .from('delivery_ratings')
      .select('id')
      .eq('order_id', order_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erreur vérification note existante:', checkError);
      return NextResponse.json(
        { error: 'Erreur serveur' },
        { status: 500 }
      );
    }

    if (existingRating) {
      // Mettre à jour la note existante
      const { data: updatedRating, error: updateError } = await supabaseAdmin
        .from('delivery_ratings')
        .update({
          rating,
          comment: comment || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erreur mise à jour note:', updateError);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la note' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        rating: updatedRating,
        message: 'Note mise à jour avec succès'
      });
    } else {
      // Créer une nouvelle note
      const { data: newRating, error: insertError } = await supabaseAdmin
        .from('delivery_ratings')
        .insert({
          order_id,
          livreur_id: order.livreur_id,
          user_id: user.id,
          rating,
          comment: comment || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erreur création note:', insertError);
        return NextResponse.json(
          { error: 'Erreur lors de la création de la note' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        rating: newRating,
        message: 'Note enregistrée avec succès'
      });
    }
  } catch (error) {
    console.error('Erreur API rating:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// GET: Récupérer les notes d'un livreur ou vérifier si une commande a déjà été notée
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const livreur_id = searchParams.get('livreur_id');
    const order_id = searchParams.get('order_id');

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

    // Si order_id est fourni, vérifier si cette commande a déjà été notée par l'utilisateur
    if (order_id) {
      const { data: rating, error: ratingError } = await supabaseAdmin
        .from('delivery_ratings')
        .select('*')
        .eq('order_id', order_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (ratingError && ratingError.code !== 'PGRST116') {
        return NextResponse.json(
          { error: 'Erreur serveur' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        has_rated: !!rating,
        rating: rating || null
      });
    }

    // Si livreur_id est fourni, récupérer toutes les notes de ce livreur
    if (livreur_id) {
      // Vérifier que l'utilisateur est admin ou le livreur lui-même
      const { data: userData, error: userDataError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userDataError || (!userData || (userData.role !== 'admin' && user.id !== livreur_id))) {
        return NextResponse.json(
          { error: 'Accès non autorisé' },
          { status: 403 }
        );
      }

      const { data: ratings, error: ratingsError } = await supabaseAdmin
        .from('delivery_ratings')
        .select('*')
        .eq('livreur_id', livreur_id)
        .order('created_at', { ascending: false });

      if (ratingsError) {
        return NextResponse.json(
          { error: 'Erreur serveur' },
          { status: 500 }
        );
      }

      return NextResponse.json({ ratings });
    }

    return NextResponse.json(
      { error: 'livreur_id ou order_id requis' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erreur API rating GET:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

