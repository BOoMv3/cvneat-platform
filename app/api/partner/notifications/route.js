import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

async function getAuthedUser(request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    if (!token) return null;

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return null;

    if (!supabaseAdmin) return null;
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || !profile?.role) return null;

    return { user, role: profile.role };
  } catch {
    return null;
  }
}

async function resolveRestaurantIdForUser(userId) {
  if (!supabaseAdmin) return null;
  const { data: restaurant, error } = await supabaseAdmin
    .from('restaurants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !restaurant?.id) return null;
  return restaurant.id;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authed = await getAuthedUser(request);
    if (!authed) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const unreadOnly = searchParams.get('unreadOnly') === '1' || searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');
    const limitRaw = searchParams.get('limit');
    const limit = Math.max(1, Math.min(100, parseInt(limitRaw || '50', 10) || 50));

    // Admin can optionally target a specific restaurant via query param.
    const restaurantIdParam = searchParams.get('restaurantId');
    let restaurantId = null;
    if (authed.role === 'admin' && restaurantIdParam) {
      restaurantId = restaurantIdParam;
    } else {
      restaurantId = await resolveRestaurantIdForUser(authed.user.id);
    }

    if (!restaurantId) {
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    // Récupérer les notifications non lues
    let query = supabaseAdmin
      .from('notifications')
      .select('id, restaurant_id, type, message, order_id, lu, created_at, data')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('lu', false);
    }
    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    return NextResponse.json(notifications || [], {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed || authed.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { restaurantId, type, message, orderId } = await request.json();

    if (!restaurantId || !type || !message) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        restaurant_id: restaurantId,
        type,
        message,
        order_id: orderId,
        lu: false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur création notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const notificationId = body.notificationId || body.id;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID requis' }, { status: 400 });
    }

    let restaurantId = null;
    if (authed.role !== 'admin') {
      restaurantId = await resolveRestaurantIdForUser(authed.user.id);
      if (!restaurantId) return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    let q = supabaseAdmin
      .from('notifications')
      .update({ lu: true })
      .eq('id', notificationId)
      .select('id, restaurant_id, type, message, order_id, lu, created_at, data')
      .single();
    if (restaurantId) q = q.eq('restaurant_id', restaurantId);

    const { data, error } = await q;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur mise à jour notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const authed = await getAuthedUser(request);
    if (!authed) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID requis' }, { status: 400 });
    }

    let restaurantId = null;
    if (authed.role !== 'admin') {
      restaurantId = await resolveRestaurantIdForUser(authed.user.id);
      if (!restaurantId) return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    let q = supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (restaurantId) q = q.eq('restaurant_id', restaurantId);

    const { error } = await q;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression notification:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression de la notification' }, { status: 500 });
  }
}