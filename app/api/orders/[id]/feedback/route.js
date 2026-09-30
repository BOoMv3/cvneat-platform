import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { refreshRestaurantRating } from '@/lib/restaurant-ratings';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getAuthedClient(token) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

/**
 * POST /api/orders/[id]/feedback
 * Enregistre l'avis client : table reviews (+ order_feedback si schéma compatible).
 */
export async function POST(request, { params }) {
  try {
    const orderId = params?.id;
    if (!orderId) {
      return NextResponse.json({ error: 'Commande manquante' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userClient = getAuthedClient(token);
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const body = await request.json();
    const overall = Number(body.overall_satisfaction) || 0;
    const food = Number(body.food_quality) || 0;
    const restaurantRating = Number(body.restaurant_rating) || food || overall;
    const rating = Math.min(5, Math.max(1, Math.round(restaurantRating || overall || food)));
    if (!rating || rating < 1) {
      return NextResponse.json({ error: 'Note invalide' }, { status: 400 });
    }

    const admin = getAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    const { data: order, error: orderError } = await admin
      .from('commandes')
      .select('id, user_id, restaurant_id, statut, livreur_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    if (order.statut !== 'livree') {
      return NextResponse.json({ error: 'Avis possible uniquement après livraison' }, { status: 400 });
    }

    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    // Upsert avis restaurant (reviews) — source de vérité pour la note affichée
    const { data: existing } = await admin
      .from('reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('restaurant_id', order.restaurant_id)
      .maybeSingle();

    if (existing?.id) {
      const { error: upErr } = await admin
        .from('reviews')
        .update({ rating, comment: comment || null })
        .eq('id', existing.id);
      if (upErr) {
        console.error('feedback review update:', upErr);
        return NextResponse.json({ error: 'Impossible de mettre à jour l\'avis' }, { status: 500 });
      }
    } else {
      const { error: insErr } = await admin.from('reviews').insert({
        user_id: user.id,
        restaurant_id: order.restaurant_id,
        rating,
        comment: comment || null,
      });
      if (insErr) {
        console.error('feedback review insert:', insErr);
        return NextResponse.json({ error: 'Impossible d\'enregistrer l\'avis' }, { status: 500 });
      }
    }

    const stats = await refreshRestaurantRating(admin, order.restaurant_id);

    // Best-effort order_feedback (peut échouer si schéma legacy bigint)
    const { error: fbErr } = await admin.from('order_feedback').upsert(
      {
        order_id: orderId,
        customer_id: user.id,
        restaurant_id: order.restaurant_id,
        overall_satisfaction: overall || rating,
        food_quality: food || null,
        delivery_speed: Number(body.delivery_speed) || null,
        delivery_quality: Number(body.delivery_quality) || null,
        restaurant_rating: rating,
        comment: comment || null,
        had_issues: Boolean(body.had_issues),
        issue_type: body.issue_type || null,
        issue_description: body.issue_description || null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'order_id,customer_id' }
    );
    if (fbErr) {
      console.warn('order_feedback skip:', fbErr.message);
    }

    return NextResponse.json({
      success: true,
      rating: stats?.rating ?? rating,
      reviews_count: stats?.reviews_count ?? null,
      livreur_id: order.livreur_id || null,
    });
  } catch (error) {
    console.error('POST feedback:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
